import type { CommandId, CompanyId } from "../ids/EntityIds.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { CommandType } from "./CommandTypes.js";

export interface CommandEnvelope<
  TType extends CommandType = CommandType,
  TPayload = unknown
> {
  readonly commandId: CommandId;
  readonly type: TType;
  readonly issuedAtGameSecond: GameSecond;
  readonly actorCompanyId?: CompanyId;
  readonly payload: TPayload;
}
