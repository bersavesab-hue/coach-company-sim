import type {
  CompanyId,
  RouteId,
  ServicePlanId,
  StaffId,
  StationId,
  TripId,
  VehicleId
} from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import { SECONDS_PER_DAY } from "../../core/time/GameTime.js";
import {
  units,
  type GameSecond
} from "../../core/units/Units.js";
import type {
  DayOperationsPlan,
  OperationsPlanIssue,
  PlannedOperationAction,
  PlannedTripAssignment
} from "../../domain/operations/DayOperationsPlan.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import { generateDepartureSlots } from "../../domain/schedule/ScheduleExpander.js";
import type { ServicePlan } from "../../domain/schedule/ServicePlan.js";
import type { Driver } from "../../domain/staff/Driver.js";
import type { OwnedVehicle } from "../../domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../domain/vehicle/VehicleModel.js";
import { findPath } from "../../domain/world/PathFinder.js";
import type { OperationsPolicy } from "../policies/OperationsPolicy.js";
import type { RepositoryBundle } from "../repositories/RepositoryBundle.js";
import { estimatePathSeconds } from "./FleetTaskTiming.js";
import { estimateRouteDrivingSeconds } from "./TripTiming.js";

interface SlotDemand {
  readonly plan: ServicePlan;
  readonly route: PassengerRoute;
  readonly departure: GameSecond;
  readonly existingTripId: TripId | null;
  readonly existingVehicleId: VehicleId | null;
  readonly existingDriverId: StaffId | null;
}

interface VehicleState {
  readonly vehicle: OwnedVehicle;
  readonly model: VehicleModel;
  readonly stationId: StationId;
  readonly availableAt: number;
  readonly energyUnits: number;
  readonly mileageM: number;
  readonly powertrainConditionPermille: number;
  readonly brakeConditionPermille: number;
  readonly tireConditionPermille: number;
  readonly nextMaintenanceMileageM: number;
}

interface DriverState {
  readonly driver: Driver;
  readonly stationId: StationId;
  readonly availableAt: number;
  readonly dutyStartedAt: number | null;
  readonly lastDrivingEndedAt: number | null;
  readonly continuousDrivingSeconds: number;
}

interface PairProjection {
  readonly vehicle: VehicleState;
  readonly driver: DriverState;
  readonly actions: readonly Omit<PlannedOperationAction, "sequence">[];
  readonly arrival: GameSecond;
  readonly score: number;
}

interface DriveSegment {
  readonly startsAt: number;
  readonly endsAt: number;
  readonly fromStationId: StationId;
  readonly toStationId: StationId;
  readonly kind: "deadhead" | "trip";
}

export interface DayOperationsPlanningInput {
  readonly companyId: CompanyId;
  readonly gameDay: number;
  readonly generatedAtGameSecond: GameSecond;
}

export class DayOperationsPlanner {
  constructor(
    private readonly repositories: RepositoryBundle,
    private readonly policy: OperationsPolicy
  ) {}

  planCompanyDay(
    input: DayOperationsPlanningInput
  ): Result<DayOperationsPlan, DomainError> {
    if (!Number.isSafeInteger(input.gameDay) || input.gameDay <= 0) {
      return err(
        new DomainError(
          "INVALID_ARGUMENT",
          "gameDay must be a positive safe integer",
          { gameDay: input.gameDay }
        )
      );
    }

    const company = this.repositories.companies.getById(input.companyId);
    if (!company || company.status !== "active") {
      return err(
        new DomainError(
          "ENTITY_INACTIVE",
          "Operations planning requires an active company",
          { companyId: input.companyId }
        )
      );
    }

    const slotsResult = this.collectSlots(input);
    if (!slotsResult.ok) return slotsResult;
    const slots = slotsResult.value;

    const vehicleStates = new Map<VehicleId, VehicleState>();
    for (const vehicle of this.repositories.vehicles.findByCompany(
      input.companyId
    )) {
      const model = this.repositories.vehicleModels.getById(vehicle.modelId);
      if (!model || !model.active) continue;
      if (!this.vehicleCanEnterPlan(vehicle)) continue;
      if (vehicle.currentStationId === null) continue;

      vehicleStates.set(vehicle.id, {
        vehicle,
        model,
        stationId: vehicle.currentStationId,
        availableAt: Number(vehicle.availableAtGameSecond),
        energyUnits: vehicle.energyUnits,
        mileageM: Number(vehicle.mileageM),
        powertrainConditionPermille: Number(
          vehicle.powertrainConditionPermille
        ),
        brakeConditionPermille: Number(vehicle.brakeConditionPermille),
        tireConditionPermille: Number(vehicle.tireConditionPermille),
        nextMaintenanceMileageM: Number(vehicle.nextMaintenanceMileageM)
      });
    }

    const driverStates = new Map<StaffId, DriverState>();
    for (const driver of this.repositories.staff.findDriversByCompany(
      input.companyId
    )) {
      if (!this.driverCanEnterPlan(driver)) continue;
      if (driver.currentStationId === null) continue;

      driverStates.set(driver.id, {
        driver,
        stationId: driver.currentStationId,
        availableAt: Number(driver.availableAtGameSecond),
        dutyStartedAt:
          driver.dutyStartedAtGameSecond === null
            ? null
            : Number(driver.dutyStartedAtGameSecond),
        lastDrivingEndedAt:
          driver.lastDutyEndedAtGameSecond === null
            ? null
            : Number(driver.lastDutyEndedAtGameSecond),
        continuousDrivingSeconds: driver.continuousDrivingSeconds
      });
    }

    const assignments: PlannedTripAssignment[] = [];
    const actionDrafts: Omit<PlannedOperationAction, "sequence">[] = [];
    const issues: OperationsPlanIssue[] = [];
    const usedVehicles = new Set<VehicleId>();
    const usedDrivers = new Set<StaffId>();

    for (const slot of slots) {
      const existing = this.repositories.trips.findByServicePlanAndDeparture(
        slot.plan.id,
        slot.departure
      );

      if (
        existing &&
        existing.status !== "planned"
      ) {
        assignments.push({
          servicePlanId: slot.plan.id,
          routeId: slot.route.id,
          existingTripId: existing.id,
          plannedDepartureGameSecond: slot.departure,
          estimatedArrivalGameSecond:
            existing.actualArrivalGameSecond ??
            existing.position.lastUpdatedGameSecond,
          vehicleId: existing.vehicleId,
          driverId: existing.driverId,
          coverage: "locked_existing"
        });
        issues.push({
          code: "EXISTING_TRIP_LOCKED",
          servicePlanId: slot.plan.id,
          routeId: slot.route.id,
          plannedDepartureGameSecond: slot.departure,
          message: "Existing trip is already executing or finalized and was not replanned"
        });
        continue;
      }

      const demand: SlotDemand = {
        plan: slot.plan,
        route: slot.route,
        departure: slot.departure,
        existingTripId: existing?.id ?? null,
        existingVehicleId: existing?.vehicleId ?? null,
        existingDriverId: existing?.driverId ?? null
      };

      const candidate = this.choosePair(
        demand,
        vehicleStates,
        driverStates
      );

      if (!candidate) {
        const compatibleVehicles = [...vehicleStates.values()].filter(
          (state) =>
            state.model.serviceClass === demand.plan.requiredVehicleClass &&
            (demand.existingVehicleId === null ||
              state.vehicle.id === demand.existingVehicleId)
        );
        const compatibleDrivers = [...driverStates.values()].filter(
          (state) =>
            state.driver.qualifiedVehicleClasses.includes(
              demand.plan.requiredVehicleClass
            ) &&
            (demand.existingDriverId === null ||
              state.driver.id === demand.existingDriverId)
        );

        const code =
          compatibleVehicles.length === 0
            ? "NO_VEHICLE"
            : compatibleDrivers.length === 0
              ? "NO_DRIVER"
              : "NO_RESOURCE_PAIR";

        assignments.push({
          servicePlanId: demand.plan.id,
          routeId: demand.route.id,
          existingTripId: demand.existingTripId,
          plannedDepartureGameSecond: demand.departure,
          estimatedArrivalGameSecond: demand.departure,
          vehicleId: null,
          driverId: null,
          coverage: "uncovered"
        });
        issues.push({
          code,
          servicePlanId: demand.plan.id,
          routeId: demand.route.id,
          plannedDepartureGameSecond: demand.departure,
          message:
            code === "NO_VEHICLE"
              ? "No compatible vehicle can cover this departure"
              : code === "NO_DRIVER"
                ? "No qualified driver can cover this departure"
                : "Vehicle and driver exist, but no feasible location/time/duty pairing was found"
        });
        continue;
      }

      vehicleStates.set(candidate.vehicle.vehicle.id, candidate.vehicle);
      driverStates.set(candidate.driver.driver.id, candidate.driver);
      usedVehicles.add(candidate.vehicle.vehicle.id);
      usedDrivers.add(candidate.driver.driver.id);
      actionDrafts.push(...candidate.actions);

      assignments.push({
        servicePlanId: demand.plan.id,
        routeId: demand.route.id,
        existingTripId: demand.existingTripId,
        plannedDepartureGameSecond: demand.departure,
        estimatedArrivalGameSecond: candidate.arrival,
        vehicleId: candidate.vehicle.vehicle.id,
        driverId: candidate.driver.driver.id,
        coverage: "covered"
      });
    }

    const actions = actionDrafts
      .slice()
      .sort(
        (a, b) =>
          Number(a.startsAtGameSecond) - Number(b.startsAtGameSecond) ||
          operationOrder(a.kind) - operationOrder(b.kind)
      )
      .map((action, index) => ({
        ...action,
        sequence: index + 1
      }));

    const deadheadDistance = actions
      .filter((action) => action.kind === "deadhead")
      .reduce((sum, action) => sum + Number(action.distanceM), 0);
    const supportSeconds = actions
      .filter((action) => action.kind !== "passenger_trip")
      .reduce(
        (sum, action) =>
          sum +
          Math.max(
            0,
            Number(action.endsAtGameSecond) -
              Number(action.startsAtGameSecond)
          ),
        0
      );

    const coveredTrips = assignments.filter(
      (assignment) =>
        assignment.coverage === "covered" ||
        assignment.coverage === "locked_existing"
    ).length;

    return ok({
      companyId: input.companyId,
      gameDay: input.gameDay,
      generatedAtGameSecond: input.generatedAtGameSecond,
      tripAssignments: assignments,
      actions,
      issues,
      stats: {
        requestedTrips: assignments.length,
        coveredTrips,
        uncoveredTrips: assignments.length - coveredTrips,
        vehiclesUsed: usedVehicles.size,
        driversUsed: usedDrivers.size,
        deadheadDistanceM: units.distanceM(deadheadDistance),
        supportSeconds
      }
    });
  }

  private collectSlots(
    input: DayOperationsPlanningInput
  ): Result<
    readonly {
      readonly plan: ServicePlan;
      readonly route: PassengerRoute;
      readonly departure: GameSecond;
    }[],
    DomainError
  > {
    const dayStart = (input.gameDay - 1) * SECONDS_PER_DAY;
    const dayEnd = dayStart + SECONDS_PER_DAY;
    const routes = this.repositories.routes
      .findActive()
      .filter((route) => route.companyId === input.companyId);
    const slots: {
      plan: ServicePlan;
      route: PassengerRoute;
      departure: GameSecond;
    }[] = [];

    for (const route of routes) {
      for (const plan of this.repositories.servicePlans.findByRoute(route.id)) {
        if (plan.status !== "active") continue;
        const generated = generateDepartureSlots(plan, input.gameDay);
        if (!generated.ok) return generated;

        for (const slot of generated.value) {
          const departure = Number(slot.plannedDepartureGameSecond);
          const existing =
            this.repositories.trips.findByServicePlanAndDeparture(
              plan.id,
              slot.plannedDepartureGameSecond
            );

          if (
            departure < Number(input.generatedAtGameSecond) &&
            !existing
          ) {
            continue;
          }
          if (departure < dayStart || departure >= dayEnd) continue;

          slots.push({
            plan,
            route,
            departure: slot.plannedDepartureGameSecond
          });
        }
      }
    }

    slots.sort(
      (a, b) =>
        Number(a.departure) - Number(b.departure) ||
        String(a.route.id).localeCompare(String(b.route.id))
    );

    return ok(slots);
  }

  private choosePair(
    demand: SlotDemand,
    vehicleStates: ReadonlyMap<VehicleId, VehicleState>,
    driverStates: ReadonlyMap<StaffId, DriverState>
  ): PairProjection | null {
    let best: PairProjection | null = null;

    for (const vehicleState of vehicleStates.values()) {
      if (
        vehicleState.model.serviceClass !==
        demand.plan.requiredVehicleClass
      ) {
        continue;
      }
      if (
        demand.existingVehicleId !== null &&
        vehicleState.vehicle.id !== demand.existingVehicleId
      ) {
        continue;
      }

      for (const driverState of driverStates.values()) {
        if (
          !driverState.driver.qualifiedVehicleClasses.includes(
            demand.plan.requiredVehicleClass
          )
        ) {
          continue;
        }
        if (
          demand.existingDriverId !== null &&
          driverState.driver.id !== demand.existingDriverId
        ) {
          continue;
        }

        const projection = this.projectPair(
          demand,
          vehicleState,
          driverState
        );
        if (!projection) continue;

        if (
          best === null ||
          projection.score < best.score ||
          (
            projection.score === best.score &&
            String(projection.vehicle.vehicle.id) <
              String(best.vehicle.vehicle.id)
          )
        ) {
          best = projection;
        }
      }
    }

    return best;
  }

  private projectPair(
    demand: SlotDemand,
    vehicleState: VehicleState,
    driverState: DriverState
  ): PairProjection | null {
    const origin = demand.route.stopPoints[0]?.stationId;
    const destination =
      demand.route.stopPoints[demand.route.stopPoints.length - 1]
        ?.stationId;
    if (!origin || !destination) return null;

    const currentStation =
      this.repositories.stations.getById(vehicleState.stationId);
    const originStation = this.repositories.stations.getById(origin);
    if (!currentStation || !originStation) return null;

    let deadheadSeconds = 0;
    let deadheadDistanceM = 0;
    let deadheadEnergyUnits = 0;
    let deadheadPathExists = true;

    if (vehicleState.stationId !== origin) {
      const path = findPath(
        this.repositories.world.get(),
        this.repositories.worldRuntime.get(),
        currentStation.worldNodeId,
        originStation.worldNodeId,
        "fastest_time"
      );
      if (!path.ok) {
        deadheadPathExists = false;
      } else {
        const timing = estimatePathSeconds(
          path.value.legs,
          vehicleState.model,
          this.repositories.world.get()
        );
        deadheadSeconds = timing.seconds;
        deadheadDistanceM = timing.distanceM;
        deadheadEnergyUnits = energyForDistance(
          vehicleState.model,
          deadheadDistanceM
        );
      }
    }

    if (!deadheadPathExists) return null;

    const tripDistanceM = routeDistanceM(
      demand.route,
      this.repositories.world.get()
    );
    if (tripDistanceM === null) return null;

    const tripSeconds = estimateRouteDrivingSeconds(
      demand.route,
      vehicleState.model,
      this.repositories.world.get()
    );
    if (tripSeconds <= 0) return null;

    const tripEnergyUnits = energyForDistance(
      vehicleState.model,
      tripDistanceM
    );

    let vehicleCursor = vehicleState.availableAt;
    let energyUnits = vehicleState.energyUnits;
    let mileageM = vehicleState.mileageM;
    let powertrain = vehicleState.powertrainConditionPermille;
    let brakes = vehicleState.brakeConditionPermille;
    let tires = vehicleState.tireConditionPermille;
    let nextMaintenanceMileageM =
      vehicleState.nextMaintenanceMileageM;
    const actions: Omit<PlannedOperationAction, "sequence">[] = [];

    const totalDistanceM = deadheadDistanceM + tripDistanceM;
    const maintenanceNeeded =
      mileageM + totalDistanceM >= nextMaintenanceMileageM ||
      powertrain -
          wearForDistance(
            vehicleState.model.powertrainWearPermillePer1000Km,
            totalDistanceM
          ) <
        vehicleState.model.minimumPowertrainConditionPermille ||
      brakes -
          wearForDistance(
            vehicleState.model.brakeWearPermillePer1000Km,
            totalDistanceM
          ) <
        vehicleState.model.minimumBrakeConditionPermille ||
      tires -
          wearForDistance(
            vehicleState.model.tireWearPermillePer1000Km,
            totalDistanceM
          ) <
        vehicleState.model.minimumTireConditionPermille;

    if (maintenanceNeeded) {
      const seconds = this.policy.maintenanceServiceSeconds(
        vehicleState.vehicle.id
      );
      const end = vehicleCursor + seconds;
      if (end > Number(demand.departure)) return null;

      actions.push({
        kind: "maintenance",
        startsAtGameSecond: units.gameSecond(vehicleCursor),
        endsAtGameSecond: units.gameSecond(end),
        vehicleId: vehicleState.vehicle.id,
        driverId: null,
        routeId: null,
        servicePlanId: null,
        existingTripId: null,
        fromStationId: vehicleState.stationId,
        toStationId: vehicleState.stationId,
        distanceM: units.distanceM(0),
        energyUnits: 0
      });

      vehicleCursor = end;
      powertrain = 1000;
      brakes = 1000;
      tires = 1000;
      nextMaintenanceMileageM =
        mileageM + vehicleState.model.serviceIntervalM;
    }

    const requiredEnergy =
      deadheadEnergyUnits +
      tripEnergyUnits +
      vehicleState.model.minimumDispatchEnergyUnits;

    if (requiredEnergy > vehicleState.model.energyCapacityUnits) {
      return null;
    }

    if (energyUnits < requiredEnergy) {
      const purchaseUnits = requiredEnergy - energyUnits;
      const seconds = this.policy.refuelServiceSeconds(
        vehicleState.model.energyKind,
        purchaseUnits
      );
      const end = vehicleCursor + seconds;
      if (end > Number(demand.departure)) return null;

      actions.push({
        kind: "refuel",
        startsAtGameSecond: units.gameSecond(vehicleCursor),
        endsAtGameSecond: units.gameSecond(end),
        vehicleId: vehicleState.vehicle.id,
        driverId: null,
        routeId: null,
        servicePlanId: null,
        existingTripId: null,
        fromStationId: vehicleState.stationId,
        toStationId: vehicleState.stationId,
        distanceM: units.distanceM(0),
        energyUnits: purchaseUnits
      });

      vehicleCursor = end;
      energyUnits += purchaseUnits;
    }

    const departure = Number(demand.departure);
    const deadheadStart = departure - deadheadSeconds;
    if (vehicleCursor > deadheadStart) return null;

    const driveSegments: DriveSegment[] = [];

    if (deadheadSeconds > 0) {
      if (
        driverState.stationId !== vehicleState.stationId ||
        driverState.availableAt > deadheadStart
      ) {
        return null;
      }

      driveSegments.push({
        startsAt: deadheadStart,
        endsAt: departure,
        fromStationId: vehicleState.stationId,
        toStationId: origin,
        kind: "deadhead"
      });
    } else if (
      driverState.stationId !== origin ||
      driverState.availableAt > departure
    ) {
      return null;
    }

    const arrival = departure + tripSeconds;
    driveSegments.push({
      startsAt: departure,
      endsAt: arrival,
      fromStationId: origin,
      toStationId: destination,
      kind: "trip"
    });

    const driverProjection = this.projectDriver(
      driverState,
      driveSegments,
      demand
    );
    if (!driverProjection) return null;

    actions.push(...driverProjection.restActions);

    if (deadheadSeconds > 0) {
      actions.push({
        kind: "deadhead",
        startsAtGameSecond: units.gameSecond(deadheadStart),
        endsAtGameSecond: units.gameSecond(departure),
        vehicleId: vehicleState.vehicle.id,
        driverId: driverState.driver.id,
        routeId: null,
        servicePlanId: null,
        existingTripId: null,
        fromStationId: vehicleState.stationId,
        toStationId: origin,
        distanceM: units.distanceM(deadheadDistanceM),
        energyUnits: deadheadEnergyUnits
      });
    }

    actions.push({
      kind: "passenger_trip",
      startsAtGameSecond: demand.departure,
      endsAtGameSecond: units.gameSecond(arrival),
      vehicleId: vehicleState.vehicle.id,
      driverId: driverState.driver.id,
      routeId: demand.route.id,
      servicePlanId: demand.plan.id,
      existingTripId: demand.existingTripId,
      fromStationId: origin,
      toStationId: destination,
      distanceM: units.distanceM(tripDistanceM),
      energyUnits: tripEnergyUnits
    });

    const wearPowertrain = wearForDistance(
      vehicleState.model.powertrainWearPermillePer1000Km,
      totalDistanceM
    );
    const wearBrakes = wearForDistance(
      vehicleState.model.brakeWearPermillePer1000Km,
      totalDistanceM
    );
    const wearTires = wearForDistance(
      vehicleState.model.tireWearPermillePer1000Km,
      totalDistanceM
    );

    const vehicleAvailable =
      arrival +
      this.policy.vehicleTurnaroundSeconds(
        vehicleState.vehicle.id,
        destination
      );
    const driverAvailable =
      arrival +
      this.policy.driverTurnaroundSeconds(
        driverState.driver.id,
        destination
      );

    return {
      vehicle: {
        ...vehicleState,
        stationId: destination,
        availableAt: vehicleAvailable,
        energyUnits:
          energyUnits - deadheadEnergyUnits - tripEnergyUnits,
        mileageM: mileageM + totalDistanceM,
        powertrainConditionPermille: Math.max(
          0,
          powertrain - wearPowertrain
        ),
        brakeConditionPermille: Math.max(0, brakes - wearBrakes),
        tireConditionPermille: Math.max(0, tires - wearTires),
        nextMaintenanceMileageM
      },
      driver: {
        ...driverProjection.state,
        stationId: destination,
        availableAt: driverAvailable
      },
      actions,
      arrival: units.gameSecond(arrival),
      score:
        deadheadDistanceM * 10 +
        actions
          .filter((action) => action.kind !== "passenger_trip")
          .reduce(
            (sum, action) =>
              sum +
              Number(action.endsAtGameSecond) -
              Number(action.startsAtGameSecond),
            0
          )
    };
  }

  private projectDriver(
    initial: DriverState,
    segments: readonly DriveSegment[],
    demand: SlotDemand
  ): {
    readonly state: DriverState;
    readonly restActions: readonly Omit<
      PlannedOperationAction,
      "sequence"
    >[];
  } | null {
    let availableAt = initial.availableAt;
    let dutyStartedAt = initial.dutyStartedAt;
    let lastDrivingEndedAt = initial.lastDrivingEndedAt;
    let continuousDrivingSeconds = initial.continuousDrivingSeconds;
    let stationId = initial.stationId;
    const restActions: Omit<PlannedOperationAction, "sequence">[] = [];

    for (const segment of segments) {
      if (
        stationId !== segment.fromStationId ||
        availableAt > segment.startsAt
      ) {
        return null;
      }

      const restSeconds = this.policy.minimumDriverRestSeconds(
        initial.driver.id
      );
      const restAvailable =
        segment.startsAt - availableAt;

      if (
        restAvailable >= restSeconds &&
        (
          continuousDrivingSeconds > 0 ||
          dutyStartedAt !== null
        )
      ) {
        if (restSeconds > 0) {
          restActions.push({
            kind: "rest",
            startsAtGameSecond: units.gameSecond(availableAt),
            endsAtGameSecond: units.gameSecond(
              availableAt + restSeconds
            ),
            vehicleId: null,
            driverId: initial.driver.id,
            routeId: null,
            servicePlanId: null,
            existingTripId: null,
            fromStationId: stationId,
            toStationId: stationId,
            distanceM: units.distanceM(0),
            energyUnits: 0
          });
        }
        continuousDrivingSeconds = 0;
        dutyStartedAt = segment.startsAt;
      }

      if (dutyStartedAt === null) {
        dutyStartedAt = segment.startsAt;
      }

      const drivingSeconds = segment.endsAt - segment.startsAt;
      if (
        continuousDrivingSeconds + drivingSeconds >
        this.policy.maximumContinuousDrivingSeconds(initial.driver.id)
      ) {
        return null;
      }

      if (
        segment.endsAt - dutyStartedAt >
        this.policy.maximumDutySeconds(initial.driver.id)
      ) {
        return null;
      }

      continuousDrivingSeconds += drivingSeconds;
      lastDrivingEndedAt = segment.endsAt;
      availableAt = segment.endsAt;
      stationId = segment.toStationId;

      if (
        segment.kind === "deadhead" &&
        segments.length > 1
      ) {
        const next = segments[segments.indexOf(segment) + 1];
        if (
          next &&
          next.startsAt - availableAt >=
            this.policy.minimumDriverRestSeconds(initial.driver.id)
        ) {
          const rest = this.policy.minimumDriverRestSeconds(
            initial.driver.id
          );
          if (rest > 0) {
            restActions.push({
              kind: "rest",
              startsAtGameSecond: units.gameSecond(availableAt),
              endsAtGameSecond: units.gameSecond(availableAt + rest),
              vehicleId: null,
              driverId: initial.driver.id,
              routeId: null,
              servicePlanId: null,
              existingTripId: null,
              fromStationId: stationId,
              toStationId: stationId,
              distanceM: units.distanceM(0),
              energyUnits: 0
            });
          }
          continuousDrivingSeconds = 0;
          dutyStartedAt = next.startsAt;
        }
      }
    }

    return {
      state: {
        ...initial,
        stationId,
        availableAt,
        dutyStartedAt,
        lastDrivingEndedAt,
        continuousDrivingSeconds
      },
      restActions
    };
  }

  private vehicleCanEnterPlan(vehicle: OwnedVehicle): boolean {
    return (
      vehicle.activeTripId === null &&
      vehicle.activeFleetTaskId === null &&
      vehicle.status !== "running" &&
      vehicle.status !== "repositioning" &&
      vehicle.status !== "refueling" &&
      vehicle.status !== "maintenance" &&
      vehicle.status !== "recovering" &&
      vehicle.status !== "broken" &&
      vehicle.status !== "sold" &&
      vehicle.status !== "retired"
    );
  }

  private driverCanEnterPlan(driver: Driver): boolean {
    return (
      driver.activeTripId === null &&
      driver.activeFleetTaskId === null &&
      driver.status !== "driving" &&
      driver.status !== "repositioning" &&
      driver.status !== "suspended"
    );
  }
}

function routeDistanceM(
  route: PassengerRoute,
  graph: RepositoryBundle["world"]["get"] extends () => infer T
    ? T
    : never
): number | null {
  let total = 0;
  for (const leg of route.pathLegs) {
    const road = graph.getRoad(leg.roadSegmentId);
    if (!road) return null;
    total += Number(road.lengthM);
  }
  return total;
}

function energyForDistance(
  model: VehicleModel,
  distanceM: number
): number {
  return Math.ceil(
    (model.drivingEnergyUnitsPer100Km * distanceM) / 100_000
  );
}

function wearForDistance(
  permillePer1000Km: number,
  distanceM: number
): number {
  return Math.ceil(
    (permillePer1000Km * distanceM) / 1_000_000
  );
}

function operationOrder(
  kind: PlannedOperationAction["kind"]
): number {
  switch (kind) {
    case "maintenance":
      return 1;
    case "refuel":
      return 2;
    case "rest":
      return 3;
    case "deadhead":
      return 4;
    case "passenger_trip":
      return 5;
  }
}
