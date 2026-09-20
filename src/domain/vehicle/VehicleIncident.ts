import type { GameSecond } from "../../core/units/Units.js";

export type VehicleIncidentKind =
  | "energy_depleted"
  | "powertrain_failure"
  | "brake_failure"
  | "tire_failure";

export interface VehicleIncident {
  readonly kind: VehicleIncidentKind;
  readonly occurredAtGameSecond: GameSecond;
}
