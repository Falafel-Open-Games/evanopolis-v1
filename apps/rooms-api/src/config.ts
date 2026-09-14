export interface RoomsApiConfig {
  readonly port: number;
  readonly host: string;
  readonly auth_base_url: string;
  readonly auth_verify_path: string;
  readonly allowed_origins: readonly string[];
  readonly rooms_data_file: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RoomsApiConfig {
  return {
    port: parsePositiveInteger(env.PORT, 3001, "PORT"),
    host: env.HOST?.trim() || "127.0.0.1",
    auth_base_url: requiredUrl(env.AUTH_BASE_URL, "AUTH_BASE_URL"),
    auth_verify_path: env.AUTH_VERIFY_PATH?.trim() || "/whoami",
    allowed_origins: parseAllowedOrigins(env.ALLOWED_ORIGINS ?? ""),
    rooms_data_file: env.ROOMS_DATA_FILE?.trim() ?? ""
  };
}

export function parseAllowedOrigins(value: string): readonly string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parsePositiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function requiredUrl(value: string | undefined, label: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} is required`);
  }
  const trimmed = value.trim();
  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
}
