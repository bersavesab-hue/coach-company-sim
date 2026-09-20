import { DomainError } from "../core/errors/DomainError.js";
import { err, type Result } from "../core/result/Result.js";

export interface QueryRequest<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
}

export type QueryHandler = (
  query: QueryRequest
) =>
  | Result<unknown, DomainError>
  | Promise<Result<unknown, DomainError>>;

export class QueryBus {
  private readonly handlers = new Map<string, QueryHandler>();

  register(type: string, handler: QueryHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Query handler already registered: ${type}`);
    }
    this.handlers.set(type, handler);
  }

  async execute(
    query: QueryRequest
  ): Promise<Result<unknown, DomainError>> {
    const handler = this.handlers.get(query.type);

    if (!handler) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          `No query handler registered for ${query.type}`
        )
      );
    }

    return handler(query);
  }
}
