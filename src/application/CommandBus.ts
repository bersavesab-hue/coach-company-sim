import type { CommandEnvelope } from "../contracts/commands/CommandEnvelope.js";
import type { CommandType } from "../contracts/commands/CommandTypes.js";
import { DomainError } from "../core/errors/DomainError.js";
import { err, type Result } from "../core/result/Result.js";

export type CommandHandler = (
  command: CommandEnvelope
) => Result<unknown, DomainError>;

export class CommandBus {
  private readonly handlers = new Map<CommandType, CommandHandler>();

  register(type: CommandType, handler: CommandHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Command handler already registered: ${type}`);
    }
    this.handlers.set(type, handler);
  }

  dispatch(
    command: CommandEnvelope
  ): Result<unknown, DomainError> {
    const handler = this.handlers.get(command.type);

    if (!handler) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          `No command handler registered for ${command.type}`
        )
      );
    }

    return handler(command);
  }
}
