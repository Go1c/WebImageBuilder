import { getAppConfig, requireEnv } from "../config";
import {
  getGenerationTimeoutMs,
  getGrokBillingSize,
  type NormalizedGenerationInput
} from "../domain/models";
import {
  base64ToGeneratedImage,
  fetchAsset,
  type GeneratedImage,
  type ImageProvider
} from "./types";
import {
  formatNonJsonUpstreamResponse,
  formatUpstreamErrorMessage,
  readUpstreamResponseBody,
  UpstreamProviderError,
  type ProviderUpstreamErrorDetail,
  type UpstreamResponseBody
} from "./upstream";

type GrokImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
    mime_type?: string;
    mimeType?: string;
  }>;
  error?: {
    message?: string;
    code?: unknown;
    type?: unknown;
  };
  message?: string;
  detail?: string;
  reason?: string;
  code?: unknown;
  type?: unknown;
};

type GrokImageProviderOptions = {
  apiKey?: string;
  baseUrl?: string;
};

type GrokImageRef = {
  url: string;
};

export class GrokImageProvider implements ImageProvider {
  constructor(private readonly options: GrokImageProviderOptions = {}) {}

  async generate(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    if (input.referenceAssets.length > 0 || input.maskAsset) {
      return this.generateEdit(input);
    }

    return this.generateImage(input);
  }

  private async generateImage(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    return this.postJson("/v1/images/generations", input, {
      model: input.providerModel,
      prompt: input.prompt,
      n: input.count,
      response_format: "b64_json",
      size: getGrokBillingSize(input.resolution)
    });
  }

  private async generateEdit(input: NormalizedGenerationInput): Promise<GeneratedImage[]> {
    const images = await Promise.all(
      input.referenceAssets.map((asset) => toGrokImageRef(asset.url, asset.mimeType))
    );
    const mask = input.maskAsset
      ? await toGrokImageRef(input.maskAsset.url, input.maskAsset.mimeType)
      : undefined;
    const body: Record<string, unknown> = {
      model: input.providerModel,
      prompt: input.prompt,
      n: input.count,
      response_format: "b64_json",
      size: getGrokBillingSize(input.resolution)
    };

    if (images.length === 1) {
      body.image = images[0];
    } else if (images.length > 1) {
      body.images = images;
    }

    if (mask) {
      body.mask = mask;
    }

    return this.postJson("/v1/images/edits", input, body);
  }

  private async postJson(
    endpoint: "/v1/images/generations" | "/v1/images/edits",
    input: NormalizedGenerationInput,
    body: Record<string, unknown>
  ): Promise<GeneratedImage[]> {
    const config = getAppConfig();
    const apiKey =
      this.options.apiKey ||
      config.grokApiKey ||
      requireEnv(config.openaiApiKey, "OPENAI_API_KEY");
    const baseUrl = this.options.baseUrl || config.openaiBaseUrl;
    const response = await fetchGrok(
      grokUrl(endpoint, baseUrl),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      },
      getGenerationTimeoutMs(input.resolution)
    );

    return parseGrokResponse(response, {
      endpoint,
      mode: input.mode,
      providerModel: input.providerModel,
      resolution: input.resolution,
      size: input.size
    });
  }
}

async function toGrokImageRef(url: string, mimeType?: string): Promise<GrokImageRef> {
  if (url.startsWith("data:")) {
    return { url };
  }

  const fetched = await fetchAsset(url);
  const type = fetched.mimeType || mimeType || "image/png";
  return {
    url: `data:${type};base64,${fetched.buffer.toString("base64")}`
  };
}

function grokUrl(path: string, baseUrl = getAppConfig().openaiBaseUrl): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function fetchGrok(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("图像网关超时，请稍后重试或先使用单页生成");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseGrokResponse(
  response: Response,
  diagnostics: {
    endpoint: "/v1/images/generations" | "/v1/images/edits";
    mode: NormalizedGenerationInput["mode"];
    providerModel: string;
    resolution: NormalizedGenerationInput["resolution"];
    size: NormalizedGenerationInput["size"];
  }
): Promise<GeneratedImage[]> {
  const body = await readUpstreamResponseBody<GrokImageResponse>(response);

  if (response.status >= 400) {
    console.warn("[image-provider/grok] upstream failure", {
      endpoint: diagnostics.endpoint,
      mode: diagnostics.mode,
      providerModel: diagnostics.providerModel,
      resolution: diagnostics.resolution,
      size: diagnostics.size,
      status: response.status,
      requestId: response.headers.get("x-request-id") || null,
      cfRay: response.headers.get("cf-ray") || null,
      contentType: response.headers.get("content-type") || null
    });
    const error = getGrokError(body, response.status);
    throw new UpstreamProviderError(error.message, error.upstream);
  }

  if (!body.json) {
    throw new Error(formatNonJsonUpstreamResponse({ body, label: "图像网关", status: response.status }));
  }

  if (body.json.error || body.json.message || body.json.reason || body.json.detail) {
    if (!body.json.data?.length) {
      const error = getGrokError(body, response.status);
      throw new UpstreamProviderError(error.message, error.upstream);
    }
  }

  const images = (
    await Promise.all(
      (body.json.data ?? []).map(async (item) => {
        const mimeType = item.mime_type || item.mimeType || "image/png";
        if (item.b64_json) {
          return base64ToGeneratedImage(item.b64_json, mimeType);
        }
        if (item.url) {
          const fetched = await fetchAsset(item.url);
          return {
            buffer: fetched.buffer,
            mimeType: fetched.mimeType || mimeType
          };
        }
        return null;
      })
    )
  ).filter(Boolean) as GeneratedImage[];

  if (!images.length) {
    throw new Error("Grok response did not contain generated images");
  }

  return images;
}

function getGrokError(
  body: UpstreamResponseBody<GrokImageResponse>,
  status: number
): {
  message: string;
  upstream: ProviderUpstreamErrorDetail;
} {
  const timeoutMessage =
    status === 524 || status === 504 || status === 408
      ? "图像网关超时，请稍后重试或先使用单页生成"
      : "";
  const primaryMessage =
    readMessage(body.json?.error?.message) ||
    readMessage(body.json?.message) ||
    readMessage(body.json?.reason) ||
    readMessage(body.json?.detail) ||
    timeoutMessage;
  const message = formatUpstreamErrorMessage({
    body,
    fallbackMessage: timeoutMessage || `Grok image request failed: ${status}`,
    primaryMessage,
    status
  });

  return {
    message,
    upstream: {
      statusCode: status,
      gatewayStatus: status,
      message: primaryMessage || message,
      rawResponse: body.json ?? body.text.trim(),
      contentType: body.contentType,
      providerRequestId: body.requestId
    }
  };
}

function readMessage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
