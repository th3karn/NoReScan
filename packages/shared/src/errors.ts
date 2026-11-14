export class RepoMindError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly details?: unknown;

  constructor(message: string, code = 'REPOMIND_ERROR', recoverable = false, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.recoverable = recoverable;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      details: this.details,
    };
  }
}

export class SecurityViolationError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'SECURITY_VIOLATION', false, details);
  }
}

export class DatabaseError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', false, details);
  }
}

export class ScannerError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'SCANNER_ERROR', true, details);
  }
}

export class AnalysisError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'ANALYSIS_ERROR', true, details);
  }
}

export class ContextError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONTEXT_ERROR', true, details);
  }
}

export class ConfigurationError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFIGURATION_ERROR', false, details);
  }
}

export class ValidationError extends RepoMindError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', false, details);
  }
}

