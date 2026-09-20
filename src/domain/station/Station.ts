import type {
  CompanyId,
  StationId,
  WorldNodeId
} from "../../contracts/ids/EntityIds.js";

export type StationStatus = "active" | "closed";

export interface Station {
  readonly id: StationId;
  readonly name: string;
  readonly worldNodeId: WorldNodeId;
  readonly ownerCompanyId: CompanyId | null;
  readonly status: StationStatus;
}
