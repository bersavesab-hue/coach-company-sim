import type { Company } from "../../domain/company/Company.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { FleetBase } from "../../domain/station/FleetBase.js";
import { fleetBaseTerms } from "../../content/company/FleetBasePolicy.js";
import { units, type GameSecond } from "../../core/units/Units.js";

// V1 had depotStationId but no base entity. Preserve every existing depot and
// vehicle position, without charging opening fees or replaying historical rent.
export function migrateFleetBases(companies: readonly Company[], vehicles: readonly OwnedVehicle[], now: GameSecond): readonly FleetBase[] {
  return companies.flatMap(company => {
    const owned = vehicles.filter(v => v.companyId === company.id && v.status !== "sold" && v.status !== "retired");
    const stationIds = new Set(owned.map(v => v.depotStationId ?? company.homeStationId).filter(id => id !== null));
    if (company.homeStationId) stationIds.add(company.homeStationId);
    return [...stationIds].map(stationId => {
      const count = owned.filter(v => (v.depotStationId ?? company.homeStationId) === stationId).length;
      const level = Math.max(1, Math.ceil(count / 12));
      return {
        companyId: company.id, stationId, level,
        dailyLeaseCents: fleetBaseTerms(stationId, level).dailyLeaseCents,
        openedAtGameSecond: company.homeStationId === stationId ? units.gameSecond(0) : now
      };
    });
  });
}
