export type AppConfig = {
  lumioApiBaseUrl: string;
  sub2ApiBaseUrl: string;
  jwtSecret?: string;
  jwtPublicKey?: string;
  databaseUrl?: string;
  localMode: boolean;
  openaiApiKey?: string;
  openaiBaseUrl: string;
  geminiApiKey?: string;
  adminEmails: string[];
  s3: {
    endpoint?: string;
    region: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
  };
};

export function getAppConfig(env = process.env): AppConfig {
  const lumioApiBaseUrl = normalizeBaseUrl(env.LUMIO_API_BASE_URL || "https://api.lumio.games");

  return {
    lumioApiBaseUrl,
    sub2ApiBaseUrl: normalizeBaseUrl(env.SUB2API_API_BASE_URL || `${lumioApiBaseUrl}/api/v1`),
    jwtSecret: env.JWT_SECRET,
    jwtPublicKey: env.JWT_PUBLIC_KEY,
    databaseUrl: env.DATABASE_URL,
    localMode: env.LUMIO_LOCAL_MODE === "true",
    openaiApiKey: env.OPENAI_API_KEY,
    openaiBaseUrl: normalizeBaseUrl(env.OPENAI_BASE_URL || "https://api.openai.com"),
    geminiApiKey: env.GEMINI_API_KEY,
    adminEmails: parseEmailList(env.ADMIN_EMAILS),
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION || "auto",
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL
    }
  };
}

export function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseEmailList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}
