/** Shape of `req.user` after `JwtAuthGuard` (see `JwtStrategy.validate`). */
export interface AuthenticatedUser {
  userId: number;
  email: string;
}

export interface AuthedRequest {
  user: AuthenticatedUser;
}
