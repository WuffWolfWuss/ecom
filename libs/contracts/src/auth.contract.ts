/**
 * Headers the gateway sets on every forwarded request. Services trust them
 * only when INTERNAL_AUTH_HEADER carries the shared INTERNAL_SECRET.
 * The gateway strips any client-supplied copy before setting them.
 */
export const INTERNAL_AUTH_HEADER = 'x-internal-secret';

export const USER_CONTEXT_HEADERS = {
  ID: 'x-user-id',
  ROLE: 'x-user-role',
  SESSION_ID: 'x-user-sid',
} as const;

/** The user identity services read from `req.user` (set by InternalAuthGuard). */
export interface IRequestUser {
  id: string;
  role: string;
  sid?: string;
}

/**
 * Redis keys for auth state. They live in their own Redis database
 * (AUTH_REDIS_URL, e.g. redis://...:6379/1), separate from saga keys in db 0.
 * Written by user-service; the gateway only reads TOKEN_VERSION and SESSION.
 */
export const AUTH_REDIS_KEYS = {
  /** Current token version of a user (int). Source of truth: users.tokenVersion. */
  tokenVersion: (userId: string) => `auth:ver:${userId}`,
  /** JSON ISessionRecord. Exists while the session is alive. */
  session: (sid: string) => `auth:sess:${sid}`,
  /** Set of session ids of a user. */
  userSessions: (userId: string) => `auth:user-sess:${userId}`,
  /** JSON IRefreshTokenRecord, keyed by SHA-256 of the refresh token. */
  refreshToken: (hash: string) => `auth:rt:${hash}`,
  /** Session id of an already-rotated refresh token (reuse detection). */
  usedRefreshToken: (hash: string) => `auth:rt-used:${hash}`,
  loginFailsByEmail: (email: string) => `auth:fail:email:${email}`,
  loginFailsByIp: (ip: string) => `auth:fail:ip:${ip}`,
  loginLockByEmail: (email: string) => `auth:lock:email:${email}`,
  /** How many times the email was locked recently (lock duration doubles). */
  loginLockLevel: (email: string) => `auth:lock-level:email:${email}`,
  loginBlockByIp: (ip: string) => `auth:block:ip:${ip}`,
  /** Gateway fixed-window rate limit for /auth/* per IP. */
  gatewayAuthRate: (ip: string, window: number) => `auth:rl:${ip}:${window}`,
} as const;

/** Machine-readable `code` in auth error responses. */
export enum EAuthErrorCode {
  /** Malformed or badly signed access token. Log in again. */
  TOKEN_INVALID = 'TOKEN_INVALID',
  /** Access token expired (or auth state was reset). Call /auth/refresh. */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  /** Token version changed (admin revoke, logout-all). Log in again. */
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  /** Session was logged out or revoked. Log in again. */
  SESSION_ENDED = 'SESSION_ENDED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  /** An already-used refresh token was presented; the session was revoked. */
  REFRESH_TOKEN_REUSED = 'REFRESH_TOKEN_REUSED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  RATE_LIMITED = 'RATE_LIMITED',
  /** Auth store (Redis) unreachable. Requests are refused (fail closed). */
  AUTH_UNAVAILABLE = 'AUTH_UNAVAILABLE',
}

export interface IAccessTokenClaims {
  sub: string;
  role: string;
  /** Session id */
  sid: string;
  /** Token version at issue time; must equal AUTH_REDIS_KEYS.tokenVersion */
  ver: number;
  typ: 'access';
  jti: string;
  iat?: number;
  exp?: number;
}

export interface ISessionRecord {
  userId: string;
  createdAt: string;
  lastUsedAt: string;
  /** Epoch ms; refresh can't extend the session past this. */
  absoluteExpiresAt: number;
  /** SHA-256 of the session's current refresh token. */
  refreshTokenHash: string;
  ip?: string;
  userAgent?: string;
}

export interface IRefreshTokenRecord {
  userId: string;
  sid: string;
  ver: number;
}

export interface ITokenResponse {
  tokenType: 'Bearer';
  accessToken: string;
  /** Seconds */
  accessTokenExpiresIn: number;
  refreshToken: string;
  /** Seconds */
  refreshTokenExpiresIn: number;
}
