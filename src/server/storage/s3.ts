import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { getAppConfig, requireEnv } from "../config";

export type StoredAsset = {
  key: string;
  url: string;
  mimeType: string;
};

function getClient(): S3Client {
  const config = getAppConfig();
  const accessKeyId = requireEnv(config.s3.accessKeyId, "S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv(config.s3.secretAccessKey, "S3_SECRET_ACCESS_KEY");

  return new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    forcePathStyle: Boolean(config.s3.endpoint),
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

function getBucket(): string {
  return requireEnv(getAppConfig().s3.bucket, "S3_BUCKET");
}

function hasS3Config(): boolean {
  const config = getAppConfig();
  return Boolean(config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey);
}

/** True when object storage is usable. The retention runner refuses to delete DB
 *  rows unless this holds, so a missing S3 config can never orphan R2 objects. */
export function isStorageConfigured(): boolean {
  return hasS3Config();
}

function shouldUseLocalStorage(): boolean {
  return getAppConfig().localMode && !hasS3Config();
}

export function getPublicAssetUrl(key: string): string {
  const config = getAppConfig();
  if (config.s3.publicBaseUrl) {
    return `${config.s3.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  if (config.s3.endpoint && config.s3.bucket) {
    return `${config.s3.endpoint.replace(/\/$/, "")}/${config.s3.bucket}/${key}`;
  }

  return `s3://${getBucket()}/${key}`;
}

export async function createPresignedUpload(input: {
  mimeType: string;
  prefix?: string;
  expiresInSeconds?: number;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const extension = input.mimeType.split("/")[1] || "bin";
  const key = `${input.prefix || "uploads"}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: input.mimeType
  });

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: input.expiresInSeconds || 900
  });

  return {
    key,
    uploadUrl,
    publicUrl: getPublicAssetUrl(key)
  };
}

export async function uploadBuffer(input: {
  buffer: Buffer;
  mimeType: string;
  prefix: string;
}): Promise<StoredAsset> {
  const extension = input.mimeType.split("/")[1] || "bin";
  const key = `${input.prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
  if (shouldUseLocalStorage()) {
    return {
      key: `local/${key}`,
      url: `data:${input.mimeType};base64,${input.buffer.toString("base64")}`,
      mimeType: input.mimeType
    };
  }

  const commandInput: PutObjectCommandInput = {
    Bucket: getBucket(),
    Key: key,
    Body: input.buffer,
    ContentType: input.mimeType
  };

  await getClient().send(new PutObjectCommand(commandInput));

  return {
    key,
    url: getPublicAssetUrl(key),
    mimeType: input.mimeType
  };
}

/**
 * List every object under a prefix with its byte size. Read-only; used by the
 * retention preview/runner to size the deletion set. Returns an empty map when
 * S3 is not configured (e.g. local mode).
 */
export async function listObjectsWithSize(prefix: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!hasS3Config()) {
    return out;
  }
  const client = getClient();
  const bucket = getBucket();
  let token: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000
      })
    );
    for (const object of response.Contents || []) {
      if (object.Key) {
        out.set(object.Key, object.Size ?? 0);
      }
    }
    token = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (token);
  return out;
}

/**
 * Delete objects by key in batches of up to 1000. No-op in local mode / when S3
 * is not configured. Deleting a missing key is a harmless no-op (idempotent), so
 * the retention runner can safely re-run after a partial failure.
 */
export async function deleteStoredObjects(keys: string[]): Promise<number> {
  if (keys.length === 0 || shouldUseLocalStorage() || !hasS3Config()) {
    return 0;
  }
  const client = getClient();
  const bucket = getBucket();
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true }
      })
    );
    if (response.Errors && response.Errors.length > 0) {
      throw new Error(
        `Failed to delete ${response.Errors.length} object(s), first: ${response.Errors[0].Key} ${response.Errors[0].Message}`
      );
    }
    deleted += chunk.length;
  }
  return deleted;
}

export async function downloadStoredAsset(key: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key
    })
  );

  if (!response.Body) {
    throw new Error("Stored asset response did not contain a body");
  }

  const bytes = await response.Body.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    mimeType: response.ContentType || "image/png"
  };
}
