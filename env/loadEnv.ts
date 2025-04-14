
export interface Env {
  MONGODB_CONNECTION_STRING: string;
  RABBIT_MQ_CONNECTION_STRING?: string;
  AUTH_SECRET_KEY: string;
  ADMIN_SECRET: string;
}

export const loadEnv = (): Env => {
  const env = Deno.env.toObject() as unknown as Env;
  
  return env;
};