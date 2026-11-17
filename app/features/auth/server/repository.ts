/** Puerto del Admin SDK que usa la feature de sesión (`Auth` de firebase-admin lo cumple por estructura). */
export interface AdminAuthPort {
  verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<{ uid: string; auth_time: number }>;
  createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string>;
  verifySessionCookie(cookie: string, checkRevoked?: boolean): Promise<{ uid: string }>;
  revokeRefreshTokens(uid: string): Promise<void>;
}
