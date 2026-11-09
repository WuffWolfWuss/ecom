/** A session as shown to its owner (GET /auth/sessions). */
export interface ISessionView {
  sid: string;
  createdAt: string;
  lastUsedAt: string;
  ip?: string;
  userAgent?: string;
  current: boolean;
}
