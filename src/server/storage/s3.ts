import {
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
