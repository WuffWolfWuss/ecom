// Token lifetimes (seconds) — overridable via env, see AuthModule / TokenService.
export const DEFAULT_ACCESS_TOKEN_TTL = 15 * 60;
export const DEFAULT_REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
export const DEFAULT_REFRESH_ABSOLUTE_TTL = 30 * 24 * 60 * 60;

// Brute-force protection
export const LOGIN_FAIL_WINDOW = 15 * 60;
export const LOGIN_MAX_FAILS_PER_EMAIL = 5;
export const LOGIN_MAX_FAILS_PER_IP = 20;
export const LOGIN_LOCK_BASE = 15 * 60; // doubles on each repeated lock
export const LOGIN_LOCK_MAX = 24 * 60 * 60;
export const LOGIN_IP_BLOCK = 15 * 60;
