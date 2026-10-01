import type { CompanyId, StationId, VehicleId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok } from "../../core/result/Result.js";
import { fleetBaseCapacity } from "../../domain/station/FleetBase.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";

export function fleetBaseVehicleCount(repositories: RepositoryBundle, companyId: CompanyId, stationId: StationId, excludeVehicleId?: VehicleId): number {
  return repositories.vehicles.findByCompany(companyId).filter(v =>
    v.id !== excludeVehicleId && v.depotStationId === stationId && v.status !== "sold" && v.status !== "retired"
  ).length;
}

export function requireFleetBaseSlot(repositories: RepositoryBundle, companyId: CompanyId, stationId: StationId | null, excludeVehicleId?: VehicleId) {
  // Core scenarios without company bases retain their station-only purchase contract.
  if (repositories.fleetBases.findByCompany(companyId).length === 0) return ok(undefined);
  const base = stationId === null ? undefined : repositories.fleetBases.get(companyId, stationId);
  if (!base) return err(new DomainError("ENTITY_NOT_FOUND", "请先在交付城市开设车队基地。"));
  if (fleetBaseVehicleCount(repositories, companyId, base.stationId, excludeVehicleId) >= fleetBaseCapacity(base.level)) {
    return err(new DomainError("FLEET_BASE_FULL", "基地车位已满，请扩建基地或选择其他基地。"));
  }
  return ok(base);
}
