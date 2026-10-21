/** Errors with a safe, user-presentable message and an HTTP status. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ProviderUnavailableError extends AppError {
  constructor(feature: string, message?: string) {
    super("PROVIDER_UNAVAILABLE", message ?? `${feature} needs a configured provider. You can enter the text manually instead.`, 503);
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Record") {
    super("NOT_FOUND", `${what} was not found or you do not have access to it.`, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this.") {
    super("FORBIDDEN", message, 403);
  }
}
