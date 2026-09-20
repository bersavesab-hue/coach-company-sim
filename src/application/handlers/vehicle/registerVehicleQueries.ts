import type { VehicleLifecycleDto } from "../../../contracts/dto/VehicleDto.js";
import { DomainError } from "../../../core/errors/DomainError.js";
import { err, ok } from "../../../core/result/Result.js";
import type { QueryBus } from "../../QueryBus.js";
import type { VehicleLifecycleQuery } from "../../queries/vehicle/VehicleQueries.js";
import type { RepositoryBundle } from "../../repositories/RepositoryBundle.js";

export function registerVehicleQueries(
  queries: QueryBus,
  repositories: RepositoryBundle
): void {
  queries.register("vehicle.lifecycle", (query) => {
    const typed = query as VehicleLifecycleQuery;
    const vehicle = repositories.vehicles.getById(
      typed.payload.vehicleId
    );

    if (!vehicle) {
      return err(
        new DomainError(
          "ENTITY_NOT_FOUND",
          "Vehicle does not exist",
          { vehicleId: typed.payload.vehicleId }
        )
      );
    }

    const model = repositories.vehicleModels.getById(vehicle.modelId);
    if (!model) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Vehicle model does not exist",
          { vehicleModelId: vehicle.modelId }
        )
      );
    }

    const dto: VehicleLifecycleDto = {
      vehicleId: vehicle.id,
      status: vehicle.status,
      energyUnits: vehicle.energyUnits,
      energyCapacityUnits: model.energyCapacityUnits,
      mileageM: Number(vehicle.mileageM),
      kilometersUntilMaintenance: Math.max(
        0,
        Math.floor(
          (
            Number(vehicle.nextMaintenanceMileageM) -
            Number(vehicle.mileageM)
          ) / 1000
        )
      ),
      powertrainConditionPermille:
        Number(vehicle.powertrainConditionPermille),
      brakeConditionPermille:
        Number(vehicle.brakeConditionPermille),
      tireConditionPermille:
        Number(vehicle.tireConditionPermille),
      bodyConditionPermille:
        Number(vehicle.bodyConditionPermille),
      insuranceValid:
        Number(vehicle.insuranceValidUntilGameSecond) >=
        Number(typed.payload.atGameSecond),
      inspectionValid:
        Number(vehicle.inspectionValidUntilGameSecond) >=
        Number(typed.payload.atGameSecond),
      activeIncident: vehicle.activeIncident?.kind ?? null
    };

    return ok(dto);
  });
}
