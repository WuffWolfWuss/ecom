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
