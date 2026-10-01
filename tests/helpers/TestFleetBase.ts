import type { FleetBaseRepository } from "../../src/application/repositories/FleetBaseRepository.js";
import type { FleetBase } from "../../src/domain/station/FleetBase.js";

export function createTestFleetBaseRepository(): FleetBaseRepository {
  const bases = new Map<string, FleetBase>();
  return {
    get: (companyId, stationId) => bases.get(`${companyId}:${stationId}`),
    findByCompany: companyId => [...bases.values()].filter(b => b.companyId === companyId),
    save: base => { bases.set(`${base.companyId}:${base.stationId}`, base); }
  };
}
