import assert from "node:assert/strict";
import test from "node:test";

import type { CommandEnvelope } from "../../src/contracts/commands/CommandEnvelope.js";
import {
  ids,
  type CompanyId,
  type RouteId,
  type ServicePlanId,
  type StaffId,
  type StationId,
  type TripId,
  type VehicleId,
  type VehicleModelId
} from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { Company } from "../../src/domain/company/Company.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";
import type { ServicePlan } from "../../src/domain/schedule/ServicePlan.js";
import type { Driver } from "../../src/domain/staff/Driver.js";
import type { Station } from "../../src/domain/station/Station.js";
import type { TripInstance } from "../../src/domain/trip/TripInstance.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import type { VehicleModel } from "../../src/domain/vehicle/VehicleModel.js";
import { WorldGraph } from "../../src/domain/world/WorldGraph.js";
import { createApplication } from "../../src/bootstrap/createApplication.js";
import type { RepositoryBundle } from "../../src/application/repositories/RepositoryBundle.js";
import type { RuntimeIdAllocator } from "../../src/application/ids/RuntimeIdAllocator.js";

function fixture() {
  const company: Company = {
    id: ids.company("company.00000001"),
    name: "测试客运",
    status: "active",
    reputationPermille: units.permille(100),
    licenseIds: [],
    homeStationId: null
  };

  const regionId = ids.region("region.000001");
  const n1 = ids.worldNode("location.000001");
  const n2 = ids.worldNode("location.000002");

  const graphResult = WorldGraph.create(
    [
      {
        id: regionId,
        name: "测试区",
        level: "province_like",
        parentRegionId: null,
        bounds: { minXM: 0, minYM: 0, maxXM: 10000, maxYM: 10000 },
        active: true
      }
    ],
    [
      { id: n1, regionId, type: "bus_station", name: "A", position: { xM: 0, yM: 0 }, active: true },
      { id: n2, regionId, type: "bus_station", name: "B", position: { xM: 1000, yM: 0 }, active: true }
    ],
    [
      {
        id: ids.roadSegment("road.000001"),
        regionId,
        fromNodeId: n1,
        toNodeId: n2,
        lengthM: units.distanceM(1000),
        speedLimitMps: units.speedMps(20),
        roadClass: "county_road",
        direction: "both",
        polyline: [],
        active: true
      }
    ]
  );
  if (!graphResult.ok) throw graphResult.error;

  const s1: Station = {
    id: ids.station("station.000001"),
    name: "A站",
    worldNodeId: n1,
    ownerCompanyId: null,
    status: "active"
  };
  const s2: Station = {
    id: ids.station("station.000002"),
    name: "B站",
    worldNodeId: n2,
    ownerCompanyId: null,
    status: "active"
  };

  const route: PassengerRoute = {
    id: ids.route("route.00000001"),
    companyId: company.id,
    code: "K01",
    type: "county",
    orderedStationIds: [s1.id, s2.id],
    pathLegs: [
      {
        roadSegmentId: ids.roadSegment("road.000001"),
        direction: "forward",
        fromNodeId: n1,
        toNodeId: n2
      }
    ],
    routingPreference: "shortest_distance",
    farePolicyId: ids.farePolicy("fare_policy.000001"),
    requiredLicenseIds: [],
    status: "active"
  };

  const model: VehicleModel = {
    id: ids.vehicleModel("vehicle_model.000001"),
    serviceClass: "county_midibus",
    active: true
  };

  const vehicle: OwnedVehicle = {
    id: ids.vehicle("vehicle.00000001"),
    companyId: company.id,
    modelId: model.id,
    mileageM: units.distanceM(0),
    conditionPermille: units.permille(900),
    fuelPermille: units.permille(900),
    status: "available",
    depotStationId: s1.id,
    activeTripId: null
  };

  const driver: Driver = {
    id: ids.staff("staff.00000001"),
    companyId: company.id,
    name: "司机甲",
    status: "available",
    qualifiedVehicleClasses: ["county_midibus"],
    activeTripId: null
  };

  const companies = new Map<CompanyId, Company>([[company.id, company]]);
  const routes = new Map<RouteId, PassengerRoute>([[route.id, route]]);
  const plans = new Map<ServicePlanId, ServicePlan>();
  const trips = new Map<TripId, TripInstance>();
  const vehicles = new Map<VehicleId, OwnedVehicle>([[vehicle.id, vehicle]]);
  const models = new Map<VehicleModelId, VehicleModel>([[model.id, model]]);
  const drivers = new Map<StaffId, Driver>([[driver.id, driver]]);
  const stations = new Map<StationId, Station>([[s1.id, s1], [s2.id, s2]]);

  const repositories: RepositoryBundle = {
    companies: {
      getById: (id) => companies.get(id),
      save: (value) => companies.set(value.id, value)
    },
    routes: {
      getById: (id) => routes.get(id),
      findByCompanyAndCode: (companyId, code) =>
        [...routes.values()].find(
          (value) => value.companyId === companyId && value.code === code
        ),
      save: (value) => routes.set(value.id, value)
    },
    servicePlans: {
      getById: (id) => plans.get(id),
      findByRoute: (routeId) =>
        [...plans.values()].filter((value) => value.routeId === routeId),
      save: (value) => plans.set(value.id, value)
    },
    staff: {
      getDriverById: (id) => drivers.get(id),
      saveDriver: (value) => drivers.set(value.id, value)
    },
    stations: {
      getById: (id) => stations.get(id)
    },
    trips: {
      getById: (id) => trips.get(id),
      findByServicePlanAndDeparture: (planId, departure) =>
        [...trips.values()].find(
          (value) =>
            value.servicePlanId === planId &&
            value.plannedDepartureGameSecond === departure
        ),
      save: (value) => trips.set(value.id, value)
    },
    vehicleModels: {
      getById: (id) => models.get(id)
    },
    vehicles: {
      getById: (id) => vehicles.get(id),
      save: (value) => vehicles.set(value.id, value)
    },
    world: {
      get: () => graphResult.value,
      replace: (_world) => undefined
    }
  };

  let planSequence = 0;
  let tripSequence = 0;
  const allocator: RuntimeIdAllocator = {
    nextRouteId: () => ids.route("route.00000002"),
    nextServicePlanId() {
      planSequence += 1;
      return ids.servicePlan(
        `service_plan.${String(planSequence).padStart(8, "0")}`
      );
    },
    nextTripId() {
      tripSequence += 1;
      return ids.trip(
        `trip.${String(tripSequence).padStart(12, "0")}`
      );
    }
  };

  const app = createApplication({ repositories, ids: allocator });

  return {
    app,
    company,
    route,
    vehicle,
    driver,
    repositories
  };
}

function command<T>(
  id: number,
  type: CommandEnvelope["type"],
  companyId: CompanyId,
  issuedAt: number,
  payload: T
): CommandEnvelope {
  return {
    commandId: ids.command(`command.${String(id).padStart(8, "0")}`),
    type,
    issuedAtGameSecond: units.gameSecond(issuedAt),
    actorCompanyId: companyId,
    payload
  };
}

async function createPlanAndTrip() {
  const f = fixture();

  const planResult = await f.app.commands.dispatch(
    command(1, "servicePlan.create", f.company.id, 100, {
      routeId: f.route.id,
      effectiveFromGameSecond: units.gameSecond(0),
      effectiveUntilGameSecond: null,
      calendar: {
        serviceDays: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday"
        ]
      },
      departurePattern: {
        kind: "fixed_times",
        secondOfDay: [6 * 3600]
      },
      requiredVehicleClass: "county_midibus"
    })
  );
  assert.equal(planResult.ok, true);
  if (!planResult.ok) throw planResult.error;

  const plan = planResult.value as ServicePlan;

  const tripResult = await f.app.commands.dispatch(
    command(2, "trip.prepare", f.company.id, 200, {
      servicePlanId: plan.id,
      plannedDepartureGameSecond: units.gameSecond(6 * 3600)
    })
  );
  assert.equal(tripResult.ok, true);
  if (!tripResult.ok) throw tripResult.error;

  return {
    ...f,
    plan,
    trip: tripResult.value as TripInstance
  };
}

test("service plan expands only official departure slots into trips", async () => {
  const f = fixture();

  const planResult = await f.app.commands.dispatch(
    command(1, "servicePlan.create", f.company.id, 100, {
      routeId: f.route.id,
      effectiveFromGameSecond: units.gameSecond(0),
      effectiveUntilGameSecond: null,
      calendar: { serviceDays: ["monday"] },
      departurePattern: {
        kind: "fixed_times",
        secondOfDay: [6 * 3600]
      },
      requiredVehicleClass: "county_midibus"
    })
  );
  assert.equal(planResult.ok, true);
  if (!planResult.ok) return;

  const plan = planResult.value as ServicePlan;

  const invalidTrip = await f.app.commands.dispatch(
    command(2, "trip.prepare", f.company.id, 200, {
      servicePlanId: plan.id,
      plannedDepartureGameSecond: units.gameSecond(7 * 3600)
    })
  );

  assert.equal(invalidTrip.ok, false);
  if (!invalidTrip.ok) {
    assert.equal(invalidTrip.error.code, "DEPARTURE_SLOT_INVALID");
  }
});

test("trip assignment enforces vehicle class and driver qualification", async () => {
  const f = await createPlanAndTrip();

  const assignedVehicle = await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  assert.equal(assignedVehicle.ok, true);

  const assignedDriver = await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );
  assert.equal(assignedDriver.ok, true);

  assert.equal(
    f.repositories.vehicles.getById(f.vehicle.id)?.status,
    "assigned"
  );
  assert.equal(
    f.repositories.staff.getDriverById(f.driver.id)?.status,
    "assigned"
  );
});

test("boarding and departure move trip, vehicle and driver together", async () => {
  const f = await createPlanAndTrip();

  await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );

  const boarding = await f.app.commands.dispatch(
    command(5, "trip.startBoarding", f.company.id, 21000, {
      tripId: f.trip.id
    })
  );
  assert.equal(boarding.ok, true);

  const departed = await f.app.commands.dispatch(
    command(6, "trip.depart", f.company.id, 21720, {
      tripId: f.trip.id
    })
  );
  assert.equal(departed.ok, true);
  if (!departed.ok) return;

  const trip = departed.value as TripInstance;
  assert.equal(trip.status, "running");
  assert.equal(Number(trip.delaySeconds), 120);
  assert.equal(
    f.repositories.vehicles.getById(f.vehicle.id)?.status,
    "running"
  );
  assert.equal(
    f.repositories.staff.getDriverById(f.driver.id)?.status,
    "driving"
  );
});

test("trip cancellation releases assigned resources", async () => {
  const f = await createPlanAndTrip();

  await f.app.commands.dispatch(
    command(3, "trip.assignVehicle", f.company.id, 300, {
      tripId: f.trip.id,
      vehicleId: f.vehicle.id
    })
  );
  await f.app.commands.dispatch(
    command(4, "trip.assignDriver", f.company.id, 400, {
      tripId: f.trip.id,
      driverId: f.driver.id
    })
  );

  const cancelled = await f.app.commands.dispatch(
    command(5, "trip.cancel", f.company.id, 500, {
      tripId: f.trip.id
    })
  );

  assert.equal(cancelled.ok, true);
  assert.equal(
    f.repositories.vehicles.getById(f.vehicle.id)?.status,
    "available"
  );
  assert.equal(
    f.repositories.staff.getDriverById(f.driver.id)?.status,
    "available"
  );
});
