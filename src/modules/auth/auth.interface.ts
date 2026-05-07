export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtPrivateKey?: string;
  jwtPublicKey?: string;
  jwtExpiration: string;
  jwtRefreshExpiration: string;
}
