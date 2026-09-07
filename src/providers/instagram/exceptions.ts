export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = code;
  }
}
export class ProfileNotFound extends AppError {
  constructor() {
    super(
      'PROFILE_NOT_AVAILABLE',
      'This profile is not available through the configured provider.',
      404,
    );
  }
}
export class Unauthorized extends AppError {
  constructor() {
    super('UNAUTHORIZED', 'Sign in to your RIGtracker workspace.', 401);
  }
}
export class PermissionMissing extends AppError {
  constructor() {
    super(
      'PERMISSION_MISSING',
      'The connected account has not granted the required permission.',
      403,
    );
  }
}
export class RateLimited extends AppError {
  constructor(seconds = 60) {
    super('RATE_LIMITED', 'Request limit reached. Please try again later.', 429, seconds);
  }
}
export class TokenExpired extends AppError {
  constructor() {
    super('TOKEN_EXPIRED', 'Your Instagram connection has expired. Reconnect in Settings.', 401);
  }
}
export class ProviderUnavailable extends AppError {
  constructor() {
    super(
      'PROVIDER_UNAVAILABLE',
      'Instagram is temporarily unavailable. Your historical data is still accessible.',
      503,
    );
  }
}
export class UnsupportedCapability extends AppError {
  constructor(
    message = 'Instagram currently does not expose this capability through the configured official API.',
  ) {
    super('UNSUPPORTED_CAPABILITY', message, 422);
  }
}
