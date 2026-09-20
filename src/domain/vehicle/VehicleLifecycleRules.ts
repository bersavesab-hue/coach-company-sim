import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import {
  units,
  type GameSecond
} from "../../core/units/Units.js";
import type { PassengerRoute } from "../route/PassengerRoute.js";
import type { WorldGraph } from "../world/WorldGraph.js";
import type { OwnedVehicle } from "./OwnedVehicle.js";
import type { VehicleModel } from "./VehicleModel.js";

export function estimateRouteEnergyUnits(
  route: PassengerRoute,
  graph: WorldGraph,
  model: VehicleModel
): Result<number, DomainError> {
  let distanceM = 0;

  for (const leg of route.pathLegs) {
    const road = graph.getRoad(leg.roadSegmentId);
    if (!road) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Route references a missing road while estimating energy",
          { roadSegmentId: leg.roadSegmentId }
        )
      );
    }
    distanceM += Number(road.lengthM);
  }

  return ok(
    Math.ceil(
      (model.drivingEnergyUnitsPer100Km * distanceM) / 100_000
    )
  );
}

export function validateVehicleDispatchReadiness(
  vehicle: OwnedVehicle,
  model: VehicleModel,
  route: PassengerRoute,
  graph: WorldGraph,
  gameSecond: GameSecond
): Result<true, DomainError> {
  if (
    vehicle.status === "running" ||
    vehicle.status === "repositioning" ||
    vehicle.status === "refueling" ||
    vehicle.status === "maintenance" ||
    vehicle.status === "recovering" ||
    vehicle.status === "broken" ||
    vehicle.status === "sold" ||
    vehicle.status === "retired"
  ) {
    return err(
      new DomainError(
        "VEHICLE_NOT_AVAILABLE",
        "Vehicle is executing another operation or unavailable for dispatch",
        { vehicleId: vehicle.id, status: vehicle.status }
      )
    );
  }

  if (
    Number(vehicle.insuranceValidUntilGameSecond) <
    Number(gameSecond)
  ) {
    return err(
      new DomainError(
        "VEHICLE_INSURANCE_EXPIRED",
        "Vehicle insurance is expired",
        { vehicleId: vehicle.id }
      )
    );
  }

  if (
    Number(vehicle.inspectionValidUntilGameSecond) <
    Number(gameSecond)
  ) {
    return err(
      new DomainError(
        "VEHICLE_INSPECTION_EXPIRED",
        "Vehicle inspection is expired",
        { vehicleId: vehicle.id }
      )
    );
  }

  if (
    Number(vehicle.mileageM) >=
    Number(vehicle.nextMaintenanceMileageM)
  ) {
    return err(
      new DomainError(
        "VEHICLE_MAINTENANCE_DUE",
        "Vehicle scheduled maintenance is overdue",
        { vehicleId: vehicle.id }
      )
    );
  }

  if (
    Number(vehicle.powertrainConditionPermille) <
      model.minimumPowertrainConditionPermille ||
    Number(vehicle.brakeConditionPermille) <
      model.minimumBrakeConditionPermille ||
    Number(vehicle.tireConditionPermille) <
      model.minimumTireConditionPermille
  ) {
    return err(
      new DomainError(
        "VEHICLE_UNSAFE",
        "Vehicle technical condition is below dispatch standard",
        { vehicleId: vehicle.id }
      )
    );
  }

  const routeEnergy = estimateRouteEnergyUnits(route, graph, model);
  if (!routeEnergy.ok) return routeEnergy;

  const requiredEnergy =
    routeEnergy.value + model.minimumDispatchEnergyUnits;

  if (vehicle.energyUnits < requiredEnergy) {
    return err(
      new DomainError(
        "VEHICLE_ENERGY_INSUFFICIENT",
        "Vehicle does not have enough energy for this route plus reserve",
        {
          vehicleId: vehicle.id,
          availableEnergyUnits: vehicle.energyUnits,
          requiredEnergyUnits: requiredEnergy
        }
      )
    );
  }

  return ok(true);
}

export function completeVehicleMaintenance(
  vehicle: OwnedVehicle,
  model: VehicleModel
): OwnedVehicle {
  const mileage = Number(vehicle.mileageM);

  return {
    ...vehicle,
    powertrainConditionPermille: units.permille(1000),
    brakeConditionPermille: units.permille(1000),
    tireConditionPermille: units.permille(1000),
    bodyConditionPermille: units.permille(1000),
    lastMaintenanceMileageM: vehicle.mileageM,
    nextMaintenanceMileageM: units.distanceM(
      mileage + model.serviceIntervalM
    ),
    status: "available",
    activeIncident: null
  };
}
