import type { CommandEnvelope } from "../../../contracts/commands/CommandEnvelope.js";
import type { CompanyId, StationId, VehicleId } from "../../../contracts/ids/EntityIds.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, ok } from "../../../core/result/Result.js";
import { fleetBaseTerms, canOpenFleetBase } from "../../../content/company/FleetBasePolicy.js";
import { FORMAL_WORLD_MAP_CONTENT } from "../../../content/map/FormalWorldMapContent.js";
import { accountBalanceCents } from "../../../domain/finance/LedgerMath.js";
import { fleetBaseCapacity, MAX_FLEET_BASE_LEVEL } from "../../../domain/station/FleetBase.js";
import { findPath } from "../../../domain/world/PathFinder.js";
import { estimatePathSeconds } from "../../services/FleetTaskTiming.js";
import type { CommandBus } from "../../CommandBus.js";
import type { QueryBus } from "../../QueryBus.js";
import type { DomainEventBus } from "../../events/DomainEventBus.js";
import { createDomainEvent } from "../../events/createDomainEvent.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";
import type { OpenFleetBasePayload, AssignFleetBasePayload } from "../../commands/fleet/FleetCommands.js";
import { fleetBaseVehicleCount, requireFleetBaseSlot } from "../../services/FleetBaseCapacity.js";

export function registerFleetBaseHandlers(commands: CommandBus, queries: QueryBus, repositories: RepositoryBundle, events: DomainEventBus): void {
  function changeBase(command: CommandEnvelope, upgrade: boolean) {
    const payload = command.payload as OpenFleetBasePayload;
    const company = command.actorCompanyId ? repositories.companies.getById(command.actorCompanyId) : undefined;
    const station = repositories.stations.getById(payload.stationId);
    if (!company || company.status !== "active" || !station || station.status !== "active") return err(new DomainError("ENTITY_NOT_FOUND", "公司或城市不存在或未开放。"));
    const existing = repositories.fleetBases.get(company.id, station.id);
    if (upgrade ? !existing : !!existing) return err(new DomainError("INVALID_STATE_TRANSITION", upgrade ? "该城市尚未开设基地。" : "该城市已经有基地。"));
    if (!existing && !canOpenFleetBase(company, station.id)) return err(new DomainError("LICENSE_REQUIRED", "该城市尚未开放，请先提升公司等级。"));
    if (existing && existing.level >= MAX_FLEET_BASE_LEVEL) return err(new DomainError("INVALID_STATE_TRANSITION", "基地已经达到最高等级。"));
    const level = (existing?.level ?? 0) + 1;
    const terms = fleetBaseTerms(station.id, level);
    const costCents = existing ? fleetBaseTerms(station.id, existing.level).upgradeCostCents : terms.openingCostCents;
    const cash = accountBalanceCents(repositories.finance.ledgerEntriesByCompany(company.id), "cash");
    if (cash < Number(costCents)) return err(new DomainError("INSUFFICIENT_FUNDS", "资金不足，无法开设或扩建基地。"));
    const base = { companyId: company.id, stationId: station.id, level, dailyLeaseCents: terms.dailyLeaseCents, openedAtGameSecond: existing?.openedAtGameSecond ?? command.issuedAtGameSecond };
    repositories.fleetBases.save(base);
    events.publish(createDomainEvent(command, existing ? "fleet.baseUpgraded" : "fleet.baseOpened", "station", station.id, { companyId: company.id, stationId: station.id, costCents, level }));
    return ok(base);
  }
  commands.register("fleet.openBase", command => changeBase(command, false));
  commands.register("fleet.upgradeBase", command => changeBase(command, true));
  commands.register("fleet.assignBase", command => {
    const payload = command.payload as AssignFleetBasePayload;
    const vehicle = payload.vehicleId ? repositories.vehicles.getById(payload.vehicleId) : undefined;
    if (!vehicle || command.actorCompanyId !== vehicle.companyId) return err(new DomainError("ENTITY_NOT_FOUND", "只能调整本公司的车辆。"));
    if (vehicle.status !== "available" || vehicle.activeTripId || vehicle.activeFleetTaskId || Number(vehicle.availableAtGameSecond) > Number(command.issuedAtGameSecond)) {
      return err(new DomainError("VEHICLE_NOT_AVAILABLE", "车辆有任务或尚未准备完毕，请待车辆空闲后调动。"));
    }
    const slot = requireFleetBaseSlot(repositories, vehicle.companyId, payload.stationId, vehicle.id);
    if (!slot.ok) return slot;
    let task: unknown = null;
    if (vehicle.currentStationId !== payload.stationId) {
      const model = repositories.vehicleModels.getById(vehicle.modelId);
      const drivers = repositories.staff.findDriversByCompany(vehicle.companyId).filter(driver =>
        model && driver.status === "available" && driver.currentStationId === vehicle.currentStationId &&
        !driver.activeTripId && !driver.activeFleetTaskId && Number(driver.availableAtGameSecond) <= Number(command.issuedAtGameSecond) &&
        driver.qualifiedVehicleClasses.includes(model.serviceClass)
      );
      if (!drivers.length) return err(new DomainError("DRIVER_NOT_AVAILABLE", "车辆所在地没有可用的合格司机，暂时无法调往基地。"));
      let result = commands.dispatch({ ...command, type: "fleet.reposition", payload: { vehicleId: vehicle.id, driverId: drivers[0]!.id, toStationId: payload.stationId } });
      for (const driver of drivers.slice(1)) {
        if (result.ok) break;
        result = commands.dispatch({ ...command, type: "fleet.reposition", payload: { vehicleId: vehicle.id, driverId: driver.id, toStationId: payload.stationId } });
      }
      if (!result.ok) return result;
      task = result.value;
    }
    const updated = { ...repositories.vehicles.getById(vehicle.id)!, depotStationId: payload.stationId };
    repositories.vehicles.save(updated);
    events.publish(createDomainEvent(command, "fleet.baseAssigned", "vehicle", vehicle.id, { vehicleId: vehicle.id, companyId: vehicle.companyId, stationId: payload.stationId }, 2));
    return ok({ vehicle: updated, task });
  });
  queries.register("fleet.baseTransfer", query => {
    const { companyId, vehicleId, stationId } = query.payload as { companyId: CompanyId; vehicleId: VehicleId; stationId: StationId };
    const vehicle = repositories.vehicles.getById(vehicleId);
    if (!vehicle || vehicle.companyId !== companyId || !vehicle.currentStationId) return err(new DomainError("VEHICLE_NOT_AVAILABLE", "车辆正在执行任务，请空闲后调动。"));
    const slot = requireFleetBaseSlot(repositories, companyId, stationId, vehicleId);
    if (!slot.ok) return slot;
    const from = repositories.stations.getById(vehicle.currentStationId), to = repositories.stations.getById(stationId), model = repositories.vehicleModels.getById(vehicle.modelId);
    if (!from || !to || !model) return err(new DomainError("ENTITY_NOT_FOUND", "车辆或基地资料缺失。"));
    if (from.id === to.id) return ok({ distanceM: 0, estimatedSeconds: 0, requiredEnergyUnits: 0 });
    const path = findPath(repositories.world.get(), repositories.worldRuntime.get(), from.worldNodeId, to.worldNodeId, "fastest_time");
    if (!path.ok) return path;
    const timing = estimatePathSeconds(path.value.legs, model, repositories.world.get());
    return ok({ distanceM: timing.distanceM, estimatedSeconds: timing.seconds, requiredEnergyUnits: Math.ceil(model.drivingEnergyUnitsPer100Km * timing.distanceM / 100_000) + model.minimumDispatchEnergyUnits });
  });
  queries.register("fleet.bases", query => {
    const { companyId } = query.payload as { companyId: CompanyId };
    const company = repositories.companies.getById(companyId);
    if (!company) return err(new DomainError("ENTITY_NOT_FOUND", "公司不存在。"));
    const vehicles = repositories.vehicles.findByCompany(companyId).filter(v => v.status !== "sold" && v.status !== "retired");
    const bases = repositories.fleetBases.findByCompany(companyId).map(base => {
      const registeredVehicles = fleetBaseVehicleCount(repositories, companyId, base.stationId);
      return {
        ...base,
        stationName: repositories.stations.getById(base.stationId)?.name ?? String(base.stationId),
        isHome: company.homeStationId === base.stationId,
        capacity: fleetBaseCapacity(base.level), registeredVehicles,
        freeSlots: Math.max(0, fleetBaseCapacity(base.level) - registeredVehicles),
        presentVehicles: vehicles.filter(v => v.currentStationId === base.stationId).length,
        availableDrivers: repositories.staff.findDriversByCompany(companyId).filter(d => d.currentStationId === base.stationId && d.status === "available").length,
        upgradeCostCents: base.level < MAX_FLEET_BASE_LEVEL ? fleetBaseTerms(base.stationId, base.level).upgradeCostCents : null,
        nextDailyLeaseCents: fleetBaseTerms(base.stationId, base.level + 1).dailyLeaseCents
      };
    });
    return ok({
      bases,
      totalCapacity: bases.reduce((sum, b) => sum + b.capacity, 0),
      dailyLeaseCents: bases.reduce((sum, b) => sum + Number(b.dailyLeaseCents), 0),
      availableCities: FORMAL_WORLD_MAP_CONTENT.stations.filter(s => canOpenFleetBase(company, s.id as StationId) && !bases.some(b => String(b.stationId) === s.id)).map(s => ({ stationId: s.id, stationName: s.name, ...fleetBaseTerms(s.id as StationId) }))
    });
  });
}
