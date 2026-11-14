import { CliResponse } from '@repomind/shared';
import pc from 'picocolors';

export class CliOutput {
  constructor(private isJson = false, private isQuiet = false) {}

  public printJson<T>(response: CliResponse<T>): void {
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
  }

  public success<T>(command: string, message: string, data?: T, projectId?: string): void {
    if (this.isJson) {
      this.printJson({
        success: true,
        command,
        projectId,
        timestamp: new Date().toISOString(),
        data,
      });
    } else if (!this.isQuiet) {
      console.log(`${pc.green('✔')} ${message}`);
    }
  }

  public error(command: string, message: string, err?: unknown, recoverable = false): void {
    if (this.isJson) {
      this.printJson({
        success: false,
        command,
        timestamp: new Date().toISOString(),
        error: {
          code: (err as any)?.code || 'COMMAND_ERROR',
          message,
          details: (err as any)?.details || String(err),
          recoverable,
        },
      });
    } else {
      console.error(`${pc.red('✖')} ${pc.bold('Error:')} ${message}`);
      if (process.env.DEBUG && err) {
        console.error(err);
      }
    }
  }

  public raw(text: string): void {
    if (!this.isQuiet) {
      process.stdout.write(text + '\n');
    }
  }
}
