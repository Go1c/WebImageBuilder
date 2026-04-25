export type AppConfig = {
  lumioApiBaseUrl: string;
  jwtSecret?: string;
  jwtPublicKey?: string;
  databaseUrl?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
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
  return {
    lumioApiBaseUrl: env.LUMIO_API_BASE_URL || "https://api.lumio.games",
    jwtSecret: env.JWT_SECRET,
    jwtPublicKey: env.JWT_PUBLIC_KEY,
    databaseUrl: env.DATABASE_URL,
    openaiApiKey: env.OPENAI_API_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
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
