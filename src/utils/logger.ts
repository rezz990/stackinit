export type LogWriter = (message: string) => void;

export interface LoggerOptions {
  readonly output?: LogWriter;
  readonly errorOutput?: LogWriter;
}

export class Logger {
  readonly #output: LogWriter;
  readonly #errorOutput: LogWriter;

  constructor(options: LoggerOptions = {}) {
    this.#output = options.output ?? console.log;
    this.#errorOutput = options.errorOutput ?? console.error;
  }

  info(message: string): void {
    this.#output(message);
  }

  success(message: string): void {
    this.#output(message);
  }

  warn(message: string): void {
    this.#errorOutput(message);
  }

  error(message: string): void {
    this.#errorOutput(message);
  }
}
