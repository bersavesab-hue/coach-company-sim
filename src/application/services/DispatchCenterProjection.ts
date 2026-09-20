import type {
  CompanyId,
  StaffId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import type {
  DispatchCenterDriverDto,
  DispatchCenterDto,
  DispatchCenterShortageDto,
  DispatchCenterSupportDto,
  DispatchCenterTripDto,
  DispatchCenterVehicleDto
} from "../../contracts/dto/OperationsDto.js";
import type { GameSecond } from "../../core/units/Units.js";
import type { ScheduledOperation } from "../../domain/operations/CommittedOperationsSchedule.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import type { OperationsPolicy } from "../policies/OperationsPolicy.js";
import type { DayOperationsPlanner } from "./DayOperationsPlanner.js";

export interface DispatchCenterProjectionInput {
  readonly companyId: CompanyId;
  readonly gameDay: number;
  readonly currentGameSecond: GameSecond;
}

export class DispatchCenterProjection {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly planner: DayOperationsPlanner,
    private readonly policy: OperationsPolicy
  ) {}

  build(
    input: DispatchCenterProjectionInput
  ): DispatchCenterDto {
    const schedule =
      this.repositories.operationsSchedules.getByCompanyAndDay(
        input.companyId,
        input.gameDay
      );

    const actions = schedule?.actions ?? [];
    const tripActions = actions.filter(
      (action) =>
        action.kind === "passenger_trip" &&
        action.tripId !== null
    );
    const supportActions = actions.filter(
      (action) => action.kind !== "passenger_trip"
    );

    const trips: DispatchCenterTripDto[] = tripActions
      .map((action) => this.tripDto(action))
      .filter(
        (value): value is DispatchCenterTripDto => value !== null
      )
      .sort(
        (a, b) =>
          a.plannedDepartureGameSecond -
            b.plannedDepartureGameSecond ||
          String(a.tripId).localeCompare(String(b.tripId))
      );

    const support: DispatchCenterSupportDto[] =
      supportActions.map((action) => this.supportDto(action));

    const vehicles = this.repositories.vehicles
      .findByCompany(input.companyId)
      .map((vehicle) =>
        this.vehicleDto(
          vehicle.id,
          actions,
          input.currentGameSecond
        )
      )
      .filter(
        (value): value is DispatchCenterVehicleDto =>
          value !== null
      )
      .sort((a, b) =>
        String(a.vehicleId).localeCompare(String(b.vehicleId))
      );

    const drivers = this.repositories.staff
      .findDriversByCompany(input.companyId)
      .map((driver) =>
        this.driverDto(
          driver.id,
          actions,
          input.currentGameSecond
        )
      )
      .filter(
        (value): value is DispatchCenterDriverDto =>
          value !== null
      )
      .sort((a, b) =>
        String(a.driverId).localeCompare(String(b.driverId))
      );

    const livePlan = this.planner.planCompanyDay({
      companyId: input.companyId,
      gameDay: input.gameDay,
      generatedAtGameSecond: input.currentGameSecond
    });

    const shortages: DispatchCenterShortageDto[] =
      livePlan.ok
        ? livePlan.value.issues
            .filter(
              (issue): issue is typeof issue & {
                code:
                  | "NO_VEHICLE"
                  | "NO_DRIVER"
                  | "NO_RESOURCE_PAIR";
              } =>
                issue.code === "NO_VEHICLE" ||
                issue.code === "NO_DRIVER" ||
                issue.code === "NO_RESOURCE_PAIR"
            )
            .map((issue) => ({
              code: issue.code,
              routeId: issue.routeId,
              routeCode:
                this.repositories.routes.getById(issue.routeId)
                  ?.code ?? String(issue.routeId),
              plannedDepartureGameSecond: Number(
                issue.plannedDepartureGameSecond
              ),
              message: issue.message
            }))
        : [];

    const delayedTrips = trips.filter(
      (trip) => trip.delaySeconds > 0
    );

    return {
      companyId: input.companyId,
      gameDay: input.gameDay,
      currentGameSecond: Number(input.currentGameSecond),
      schedule: {
        committed: schedule !== undefined,
        revision: schedule?.revision ?? null,
        status: schedule?.status ?? "not_committed",
        committedAtGameSecond:
          schedule === undefined
            ? null
            : Number(schedule.committedAtGameSecond),
        generatedAtGameSecond:
          schedule === undefined
            ? null
            : Number(schedule.generatedAtGameSecond),
        replanAtGameSecond:
          schedule?.replanAtGameSecond === null ||
          schedule?.replanAtGameSecond === undefined
            ? null
            : Number(schedule.replanAtGameSecond)
      },
      summary: {
        passengerTripsTotal: trips.length,
        passengerTripsPlanned: trips.filter(
          (trip) => trip.tripStatus === "planned"
        ).length,
        passengerTripsBoarding: trips.filter(
          (trip) => trip.tripStatus === "boarding"
        ).length,
        passengerTripsRunning: trips.filter(
          (trip) => trip.tripStatus === "running"
        ).length,
        passengerTripsDisrupted: trips.filter(
          (trip) => trip.tripStatus === "disrupted"
        ).length,
        passengerTripsCompleted: trips.filter(
          (trip) => trip.tripStatus === "completed"
        ).length,
        passengerTripsFailed: trips.filter(
          (trip) => trip.operationStatus === "failed"
        ).length,
        delayedTrips: delayedTrips.length,
        maxDelaySeconds: delayedTrips.reduce(
          (max, trip) => Math.max(max, trip.delaySeconds),
          0
        ),
        supportActionsTotal: support.length,
        supportActionsRunning: support.filter(
          (action) =>
            action.status === "started" ||
            action.status === "boarding"
        ).length,
        supportActionsFailed: support.filter(
          (action) => action.status === "failed"
        ).length,
        shortageTrips: shortages.length,
        fleetTotal: vehicles.length,
        fleetAvailable: vehicles.filter(
          (vehicle) => vehicle.status === "available"
        ).length,
        fleetRunning: vehicles.filter(
          (vehicle) => vehicle.status === "running"
        ).length,
        fleetBroken: vehicles.filter(
          (vehicle) => vehicle.status === "broken"
        ).length,
        fleetInSupport: vehicles.filter((vehicle) =>
          [
            "repositioning",
            "refueling",
            "maintenance",
            "recovering"
          ].includes(vehicle.status)
        ).length,
        driversTotal: drivers.length,
        driversAvailable: drivers.filter(
          (driver) => driver.status === "available"
        ).length,
        driversDriving: drivers.filter(
          (driver) => driver.status === "driving"
        ).length,
        driversResting: drivers.filter(
          (driver) => driver.status === "off_duty"
        ).length
      },
      trips,
      support,
      vehicles,
      drivers,
      shortages
    };
  }

  private tripDto(
    action: ScheduledOperation
  ): DispatchCenterTripDto | null {
    if (action.tripId === null) return null;
    const trip = this.repositories.trips.getById(action.tripId);
    if (!trip) return null;

    const route = this.repositories.routes.getById(trip.routeId);
    const originId = route?.stopPoints[0]?.stationId ?? null;
    const destinationId =
      route?.stopPoints[route.stopPoints.length - 1]?.stationId ??
      null;
    const vehicle =
      trip.vehicleId === null
        ? undefined
        : this.repositories.vehicles.getById(trip.vehicleId);

    return {
      sequence: action.sequence,
      tripId: trip.id,
      routeId: trip.routeId,
      routeCode: route?.code ?? String(trip.routeId),
      originStationId: originId,
      originStationName:
        originId === null
          ? null
          : this.repositories.stations.getById(originId)?.name ??
            null,
      destinationStationId: destinationId,
      destinationStationName:
        destinationId === null
          ? null
          : this.repositories.stations.getById(destinationId)
              ?.name ?? null,
      plannedDepartureGameSecond: Number(
        trip.plannedDepartureGameSecond
      ),
      boardingStartGameSecond:
        Number(trip.plannedDepartureGameSecond) -
        (route === undefined
          ? 0
          : this.policy.passengerBoardingLeadSeconds(route.id)),
      actualDepartureGameSecond:
        trip.actualDepartureGameSecond === null
          ? null
          : Number(trip.actualDepartureGameSecond),
      actualArrivalGameSecond:
        trip.actualArrivalGameSecond === null
          ? null
          : Number(trip.actualArrivalGameSecond),
      scheduledEndGameSecond: Number(action.endsAtGameSecond),
      tripStatus: trip.status,
      operationStatus: action.status,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      delaySeconds: Number(trip.delaySeconds),
      recoveryStationId: trip.recoveryStationId,
      activeIncident: vehicle?.activeIncident?.kind ?? null,
      failureCode: action.failureCode
    };
  }

  private supportDto(
    action: ScheduledOperation
  ): DispatchCenterSupportDto {
    return {
      sequence: action.sequence,
      kind: action.kind as DispatchCenterSupportDto["kind"],
      status: action.status,
      startsAtGameSecond: Number(action.startsAtGameSecond),
      endsAtGameSecond: Number(action.endsAtGameSecond),
      vehicleId: action.vehicleId,
      driverId: action.driverId,
      fleetTaskId: action.fleetTaskId,
      fromStationId: action.fromStationId,
      fromStationName:
        action.fromStationId === null
          ? null
          : this.repositories.stations.getById(
              action.fromStationId
            )?.name ?? null,
      toStationId: action.toStationId,
      toStationName:
        action.toStationId === null
          ? null
          : this.repositories.stations.getById(
              action.toStationId
            )?.name ?? null,
      distanceM: Number(action.distanceM),
      energyUnits: action.energyUnits,
      failureCode: action.failureCode
    };
  }

  private vehicleDto(
    vehicleId: VehicleId,
    actions: readonly ScheduledOperation[],
    currentGameSecond: GameSecond
  ): DispatchCenterVehicleDto | null {
    const vehicle = this.repositories.vehicles.getById(vehicleId);
    if (!vehicle) return null;
    const model = this.repositories.vehicleModels.getById(
      vehicle.modelId
    );
    if (!model) return null;

    const next = nextActionFor(
      actions,
      currentGameSecond,
      (action) => action.vehicleId === vehicle.id,
      (action) => this.actionExecutionStart(action)
    );

    return {
      vehicleId: vehicle.id,
      modelId: vehicle.modelId,
      serviceClass: model.serviceClass,
      status: vehicle.status,
      currentStationId: vehicle.currentStationId,
      currentStationName:
        vehicle.currentStationId === null
          ? null
          : this.repositories.stations.getById(
              vehicle.currentStationId
            )?.name ?? null,
      availableAtGameSecond: Number(vehicle.availableAtGameSecond),
      energyUnits: vehicle.energyUnits,
      energyCapacityUnits: vehicle.energyCapacityUnits,
      energyPermille:
        vehicle.energyCapacityUnits <= 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1000,
                Math.floor(
                  (vehicle.energyUnits * 1000) /
                    vehicle.energyCapacityUnits
                )
              )
            ),
      mileageM: Number(vehicle.mileageM),
      kilometersUntilMaintenance: Math.max(
        0,
        Math.floor(
          (Number(vehicle.nextMaintenanceMileageM) -
            Number(vehicle.mileageM)) /
            1000
        )
      ),
      powertrainConditionPermille: Number(
        vehicle.powertrainConditionPermille
      ),
      brakeConditionPermille: Number(
        vehicle.brakeConditionPermille
      ),
      tireConditionPermille: Number(
        vehicle.tireConditionPermille
      ),
      insuranceValid:
        Number(vehicle.insuranceValidUntilGameSecond) >=
        Number(currentGameSecond),
      inspectionValid:
        Number(vehicle.inspectionValidUntilGameSecond) >=
        Number(currentGameSecond),
      activeIncident: vehicle.activeIncident?.kind ?? null,
      activeTripId: vehicle.activeTripId,
      activeFleetTaskId: vehicle.activeFleetTaskId,
      nextOperationSequence: next?.sequence ?? null,
      nextOperationKind: next?.kind ?? null,
      nextOperationGameSecond:
        next === null
          ? null
          : this.actionExecutionStart(next)
    };
  }

  private actionExecutionStart(
    action: ScheduledOperation
  ): number {
    if (
      action.kind !== "passenger_trip" ||
      action.tripId === null
    ) {
      return Number(action.startsAtGameSecond);
    }

    const trip = this.repositories.trips.getById(action.tripId);
    if (!trip) return Number(action.startsAtGameSecond);

    return (
      Number(action.startsAtGameSecond) -
      this.policy.passengerBoardingLeadSeconds(trip.routeId)
    );
  }

  private driverDto(
    driverId: StaffId,
    actions: readonly ScheduledOperation[],
    currentGameSecond: GameSecond
  ): DispatchCenterDriverDto | null {
    const driver = this.repositories.staff.getDriverById(driverId);
    if (!driver) return null;

    const next = nextActionFor(
      actions,
      currentGameSecond,
      (action) => action.driverId === driver.id,
      (action) => this.actionExecutionStart(action)
    );

    return {
      driverId: driver.id,
      name: driver.name,
      status: driver.status,
      currentStationId: driver.currentStationId,
      currentStationName:
        driver.currentStationId === null
          ? null
          : this.repositories.stations.getById(
              driver.currentStationId
            )?.name ?? null,
      availableAtGameSecond: Number(driver.availableAtGameSecond),
      dutyStartedAtGameSecond:
        driver.dutyStartedAtGameSecond === null
          ? null
          : Number(driver.dutyStartedAtGameSecond),
      continuousDrivingSeconds: driver.continuousDrivingSeconds,
      activeTripId: driver.activeTripId,
      activeFleetTaskId: driver.activeFleetTaskId,
      nextOperationSequence: next?.sequence ?? null,
      nextOperationKind: next?.kind ?? null,
      nextOperationGameSecond:
        next === null
          ? null
          : this.actionExecutionStart(next)
    };
  }
}

function nextActionFor(
  actions: readonly ScheduledOperation[],
  currentGameSecond: GameSecond,
  predicate: (action: ScheduledOperation) => boolean,
  executionStart: (action: ScheduledOperation) => number
): ScheduledOperation | null {
  const current = Number(currentGameSecond);

  return (
    actions
      .filter(
        (action) =>
          action.status === "planned" &&
          executionStart(action) >= current &&
          predicate(action)
      )
      .sort(
        (a, b) =>
          executionStart(a) -
            executionStart(b) ||
          a.sequence - b.sequence
      )[0] ?? null
  );
}
