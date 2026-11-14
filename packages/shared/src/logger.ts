export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  operationId?: string;
  projectId?: string;
  details?: unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  json?: boolean;
  quiet?: boolean;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;
  private json: boolean;
  private quiet: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.json = options.json ?? false;
    this.quiet = options.quiet ?? false;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public setJson(json: boolean): void {
    this.json = json;
  }

  public setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.quiet && level !== 'error') return false;
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.level];
  }

  private emit(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.json) {
      process.stderr.write(JSON.stringify(entry) + '\n');
    } else {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
      const op = entry.operationId ? ` [${entry.operationId}]` : '';
      const msg = `${prefix}${op} ${entry.message}`;

      if (entry.level === 'error') {
        console.error(msg, entry.details !== undefined ? entry.details : '');
      } else if (entry.level === 'warn') {
        console.warn(msg, entry.details !== undefined ? entry.details : '');
      } else {
        console.error(msg, entry.details !== undefined ? entry.details : '');
      }
    }
  }

  public debug(message: string, details?: unknown, operationId?: string, projectId?: string): void {
    this.emit({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      details,
      operationId,
      projectId,
    });
  }

  public info(message: string, details?: unknown, operationId?: string, projectId?: string): void {
    this.emit({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      details,
      operationId,
      projectId,
    });
  }

  public warn(message: string, details?: unknown, operationId?: string, projectId?: string): void {
    this.emit({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      details,
      operationId,
      projectId,
    });
  }

  public error(message: string, details?: unknown, operationId?: string, projectId?: string): void {
    this.emit({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      details,
      operationId,
      projectId,
    });
  }
}

export const defaultLogger = new Logger();

