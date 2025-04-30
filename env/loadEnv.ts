export interface Env {
  MONGODB_CONNECTION_STRING: string;
  RABBIT_MQ_CONNECTION_STRING?: string;
  RABBIT_MQ_CREDENTIALS?: string;
  AUTH_SECRET_KEY: string;
  ADMIN_SECRET: string;
  MODE: "inMemory" | "integrated";
}

export const loadEnv = (): Env => {
  const env = Deno.env.toObject() as unknown as Env;
  if (!env.MODE) env.MODE = "integrated";
  return env;
};
