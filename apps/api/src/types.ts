export interface Env {
  DB: D1Database;
  DEFAULT_ORG_ID: string;
  GOOGLE_CLIENT_ID?: string;
  DEV_AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface AppEnv {
  Bindings: Env;
  Variables: {
    user: AuthUser;
    orgId: string;
  };
}
