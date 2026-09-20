import type { ErrorCode } from "./ErrorCode.js";

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {}
  ) {
    super(message);
    this.name = "DomainError";
  }
}
