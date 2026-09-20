import assert from "node:assert/strict";
import test from "node:test";

import {
  ids,
  type CommandId
} from "../../src/contracts/ids/EntityIds.js";
import type { CommandType } from "../../src/contracts/commands/CommandTypes.js";
import { units } from "../../src/core/units/Units.js";
import {
  createPlayableGame,
  PLAYABLE_COMPANY_ID,
  PLAYABLE_FARE_POLICY_ID
} from "../../src/bootstrap/createPlayableGame.js";
import type { PassengerRoute } from "../../src/domain/route/PassengerRoute.js";

test("playable client completes buy-route-schedule-operate-finance loop", async () => {
  const runtime = createPlayableGame();
  let now = runtime.startGameSecond;
  let commandSequence = 1;

  const dispatch = (
    type: CommandType,
    payload: unknown
  ) =>
    runtime.app.commands.dispatch({
      commandId: ids.command(
        `command.playtest.${String(
          commandSequence++
        ).padStart(10, "0")}`
      ) as CommandId,
      type,
      issuedAtGameSecond: now,
      actorCompanyId: PLAYABLE_COMPANY_ID,
      payload
    });

  const market = await runtime.app.queries.execute({
    type: "vehicleMarket.listings",
    payload: {
      currentGameSecond: now,
      listingKind: "new",
      viewerCompanyId: PLAYABLE_COMPANY_ID
    }
  });
  assert.equal(market.ok, true);
  if (!market.ok) return;

  const listings = market.value as readonly any[];
  const listing = listings.find(
    (value) => value.purchaseUnlocked
  );
  assert.ok(listing);

  const purchased = dispatch(
    "vehicleMarket.purchaseListing",
    {
      companyId: PLAYABLE_COMPANY_ID,
      listingId: listing.listingId,
      configurationId: null,
      depotStationId:
        runtime.company.homeStationId
    }
  );
  assert.equal(purchased.ok, true);
  if (!purchased.ok) return;

  const vehicle = purchased.value as any;
  const model =
    runtime.repositories.vehicleModels.getById(
      vehicle.modelId
    );
  assert.ok(model);

  const refuel = dispatch("vehicle.refuel", {
    vehicleId: vehicle.id,
    energyUnits:
      vehicle.energyCapacityUnits -
      vehicle.energyUnits
  });
  assert.equal(refuel.ok, true);

  now = units.gameSecond(
    Number(now) + 3600
  );
  runtime.app.simulation.advanceTo(now);

  const routeCreated = dispatch(
    "route.create",
    {
      companyId: PLAYABLE_COMPANY_ID,
      code: "K01",
      routeType: "intercity",
      orderedStationIds: [
        runtime.stations[0]!.id,
        runtime.stations[2]!.id
      ],
      routingPreference: "fastest_time",
      farePolicyId:
        PLAYABLE_FARE_POLICY_ID,
      requiredLicenseIds: []
    }
  );
  assert.equal(routeCreated.ok, true);
  if (!routeCreated.ok) return;
  const route =
    routeCreated.value as PassengerRoute;

  assert.equal(
    dispatch("route.activate", {
      routeId: route.id
    }).ok,
    true
  );

  const plan = dispatch(
    "servicePlan.create",
    {
      routeId: route.id,
      effectiveFromGameSecond:
        units.gameSecond(0),
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
        kind: "interval_window",
        windows: [
          {
            startSecondOfDay: 7 * 3600,
            endSecondOfDay: 12 * 3600,
            intervalSeconds: 90 * 60
          }
        ]
      },
      requiredVehicleClass:
        model.serviceClass
    }
  );
  assert.equal(plan.ok, true);

  const commit = dispatch(
    "operations.commitDayPlan",
    {
      companyId: PLAYABLE_COMPANY_ID,
      gameDay: 1,
      allowPartial: true
    }
  );
  assert.equal(commit.ok, true);

  now = units.gameSecond(13 * 3600);
  const report =
    runtime.app.simulation.advanceTo(now);
  assert.equal(
    report.issues.length,
    0
  );

  const dispatchCenter =
    await runtime.app.queries.execute({
      type: "operations.dispatchCenter",
      payload: {
        companyId: PLAYABLE_COMPANY_ID,
        gameDay: 1,
        currentGameSecond: now
      }
    });
  assert.equal(dispatchCenter.ok, true);
  if (!dispatchCenter.ok) return;
  const dispatchDto =
    dispatchCenter.value as any;
  assert.equal(
    dispatchDto.summary.passengerTripsTotal > 0,
    true
  );
  assert.equal(
    dispatchDto.summary.passengerTripsCompleted > 0,
    true
  );

  const finance =
    await runtime.app.queries.execute({
      type: "finance.companySnapshot",
      payload: {
        companyId: PLAYABLE_COMPANY_ID
      }
    });
  assert.equal(finance.ok, true);
  if (!finance.ok) return;
  const financeDto = finance.value as any;
  assert.equal(
    financeDto.passengerRevenueCents > 0,
    true
  );
  assert.equal(
    financeDto.cashBalanceCents > 0,
    true
  );
});
