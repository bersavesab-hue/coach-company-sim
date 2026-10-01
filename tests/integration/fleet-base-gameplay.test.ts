import assert from "node:assert/strict";
import test from "node:test";
import { createPlayableGame, PLAYABLE_COMPANY_ID } from "../../src/bootstrap/createPlayableGame.js";
import { PlayableClient } from "../../src/presentation/android/PlayableClient.js";
import { parsePlayableSave } from "../../src/save/playable/PlayableSave.js";
import { ids } from "../../src/contracts/ids/EntityIds.js";
import { units } from "../../src/core/units/Units.js";
import type { CommandType } from "../../src/contracts/commands/CommandTypes.js";
import type { OwnedVehicle } from "../../src/domain/vehicle/OwnedVehicle.js";
import { accountBalanceCents } from "../../src/domain/finance/LedgerMath.js";

function fixture() {
  const runtime = createPlayableGame();
  let sequence = 1, now = runtime.startGameSecond;
  const dispatch = (type: CommandType, payload: unknown) => runtime.app.commands.dispatch({ commandId: ids.command(`command.base.${sequence++}`), type, actorCompanyId: PLAYABLE_COMPANY_ID, issuedAtGameSecond: now, payload });
  return { runtime, dispatch, advance: (seconds: number) => { now = units.gameSecond(Number(now) + seconds); runtime.app.simulation.advanceTo(now); }, cash: () => accountBalanceCents(runtime.repositories.finance.ledgerEntriesByCompany(PLAYABLE_COMPANY_ID), "cash") };
}

async function buy(f: ReturnType<typeof fixture>) {
  const result = await f.runtime.app.queries.execute({ type: "vehicleMarket.listings", payload: { currentGameSecond: f.runtime.startGameSecond, listingKind: "new", viewerCompanyId: PLAYABLE_COMPANY_ID } });
  assert.ok(result.ok);
  const listing = (result.value as any[]).filter(l => l.purchaseUnlocked).sort((a, b) => a.askingPriceCents - b.askingPriceCents)[0];
  const purchase = f.dispatch("vehicleMarket.purchaseListing", { companyId: PLAYABLE_COMPANY_ID, listingId: listing.listingId, configurationId: null, depotStationId: f.runtime.company.homeStationId });
  assert.ok(purchase.ok);
  return purchase.value as OwnedVehicle;
}

test("base opening and expansion charge the ledger once and reject locked or duplicate cities", async () => {
  const client = new PlayableClient(), initial = await client.snapshot() as any;
  const target = initial.fleetBases.availableCities[0];
  assert.ok(target);
  assert.equal((await client.openFleetBase(target.stationId)).ok, true);
  const opened = await client.snapshot() as any;
  assert.equal(initial.finance.cashBalanceCents - opened.finance.cashBalanceCents, target.openingCostCents);
  const base = opened.fleetBases.bases.find((b: any) => b.stationId === target.stationId);
  assert.equal(base.capacity, 12);
  assert.equal((await client.openFleetBase(target.stationId)).ok, false);
  assert.equal((await client.upgradeFleetBase(target.stationId)).ok, true);
  const upgraded = await client.snapshot() as any;
  assert.equal(opened.finance.cashBalanceCents - upgraded.finance.cashBalanceCents, base.upgradeCostCents);
  assert.equal(upgraded.fleetBases.bases.find((b: any) => b.stationId === target.stationId).capacity, 24);
  const locked = initial.stations.find((s: any) => !s.unlocked);
  assert.equal((await client.openFleetBase(locked.id)).ok, false);
});

test("full base prevents purchase without charging money or consuming stock", async () => {
  const f = fixture(), vehicle = await buy(f), home = f.runtime.company.homeStationId!;
  for (let n = 1; n < 12; n++) f.runtime.repositories.vehicles.save({ ...vehicle, id: ids.vehicle(`vehicle.capacity.${n}`) });
  const stock = f.runtime.repositories.vehicleMarket.findListings().find(l => l.status === "available" && l.kind === "new" && l.modelId === vehicle.modelId)!;
  const before = f.cash(), count = stock.stockCount;
  const result = f.dispatch("vehicleMarket.purchaseListing", { companyId: PLAYABLE_COMPANY_ID, listingId: stock.id, configurationId: null, depotStationId: home });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "FLEET_BASE_FULL");
  assert.equal(f.cash(), before);
  assert.equal(f.runtime.repositories.vehicleMarket.getListing(stock.id)!.stockCount, count);
});

test("remote base assignment moves along official roads and survives a mid-transfer save", async () => {
  const f = fixture(), bought = await buy(f), destination = f.runtime.stations[1]!.id;
  assert.ok(f.dispatch("fleet.openBase", { stationId: destination }).ok);
  assert.ok(f.dispatch("vehicle.refuel", { vehicleId: bought.id, energyUnits: bought.energyCapacityUnits - bought.energyUnits }).ok);
  f.advance(3600);
  const before = f.runtime.repositories.vehicles.getById(bought.id)!;
  const assignment = f.dispatch("fleet.assignBase", { vehicleId: before.id, stationId: destination });
  assert.ok(assignment.ok);
  const moving = f.runtime.repositories.vehicles.getById(before.id)!;
  assert.equal(moving.status, "repositioning");
  assert.equal(moving.currentStationId, null);
  assert.equal(moving.depotStationId, destination);
  const task = f.runtime.repositories.fleetTasks.getById(moving.activeFleetTaskId!)!;
  assert.ok(task.pathLegs.length > 0);
  assert.ok(Number(task.completesAtGameSecond) > Number(task.startedAtGameSecond));
  const save = new PlayableClient().exportSave();
  const parsed = parsePlayableSave(JSON.stringify({ ...save, payload: { ...save.payload, currentGameSecond: task.startedAtGameSecond, idAllocator: f.runtime.idAllocator.snapshot(), repositories: f.runtime.repositories.exportPersistentState() } }));
  assert.ok(parsed);
  const restored = createPlayableGame(parsed.payload);
  restored.app.simulation.advanceTo(units.gameSecond(Number(task.completesAtGameSecond) + 60));
  const arrived = restored.repositories.vehicles.getById(before.id)!;
  assert.equal(arrived.currentStationId, destination);
  assert.equal(arrived.depotStationId, destination);
  assert.equal(arrived.activeFleetTaskId, null);
  assert.ok(arrived.mileageM > before.mileageM);
  assert.ok(arrived.energyUnits < before.energyUnits);
  assert.equal(restored.repositories.staff.getDriverById(task.driverId!)!.currentStationId, destination);
});

test("failed transfer leaves both base registration and resources unchanged", async () => {
  const f = fixture(), vehicle = await buy(f), destination = f.runtime.stations[1]!.id;
  assert.ok(f.dispatch("fleet.openBase", { stationId: destination }).ok);
  f.runtime.repositories.vehicles.save({ ...vehicle, energyUnits: 0 });
  const before = f.runtime.repositories.exportPersistentState();
  const result = f.dispatch("fleet.assignBase", { vehicleId: vehicle.id, stationId: destination });
  assert.equal(result.ok, false);
  assert.deepEqual(f.runtime.repositories.exportPersistentState(), before);
});

test("base daily rent is not duplicated by repeated ticks or by restoring a save", async () => {
  const f = fixture(), stationId = f.runtime.stations[1]!.id;
  assert.ok(f.dispatch("fleet.openBase", { stationId }).ok);
  f.advance(86400);
  const rents = f.runtime.repositories.finance.ledgerEntriesByCompany(PLAYABLE_COMPANY_ID).filter(e => e.kind === "station_lease");
  assert.equal(rents.length, 2); // home + remote
  assert.equal(new Set(rents.map(e => e.sourceRef)).size, 2);
  f.advance(1);
  assert.equal(f.runtime.repositories.finance.ledgerEntriesByCompany(PLAYABLE_COMPANY_ID).filter(e => e.kind === "station_lease").length, 2);
  const save = new PlayableClient().exportSave();
  const payload = { ...save.payload, currentGameSecond: units.gameSecond(Number(f.runtime.startGameSecond) + 86401), repositories: f.runtime.repositories.exportPersistentState() };
  const restored = createPlayableGame(payload);
  restored.app.simulation.advanceTo(units.gameSecond(Number(payload.currentGameSecond) + 1));
  assert.equal(restored.repositories.finance.ledgerEntriesByCompany(PLAYABLE_COMPANY_ID).filter(e => e.kind === "station_lease").length, 2);
});

test("V1 saves migrate populated depots with sufficient capacity, keeping money time and physical positions", async () => {
  const client = new PlayableClient(), snap = await client.snapshot() as any;
  assert.ok((await client.buyVehicle(snap.market.find((l: any) => l.purchaseUnlocked).listingId)).ok);
  const saved = client.exportSave(), repositories = saved.payload.repositories;
  const seed = repositories.vehicles.find(v => v.companyId === PLAYABLE_COMPANY_ID)!;
  const vehicles = [...repositories.vehicles, ...Array.from({ length: 29 }, (_, n) => ({ ...seed, id: ids.vehicle(`vehicle.migration.${n}`) }))];
  const old: any = { ...saved, saveVersion: 1, payload: { ...saved.payload, repositories: { ...repositories, vehicles } } };
  delete old.payload.repositories.fleetBases;
  const migrated = parsePlayableSave(JSON.stringify(old));
  assert.ok(migrated);
  assert.equal(migrated.saveVersion, 2);
  assert.equal(migrated.createdAtIso, saved.createdAtIso);
  assert.deepEqual(migrated.payload.repositories.ledgerEntries, repositories.ledgerEntries);
  assert.deepEqual(migrated.payload.repositories.vehicles, vehicles);
  const restored = await new PlayableClient(migrated).snapshot() as any;
  assert.equal(restored.fleetBases.bases[0].capacity, 36);
  assert.equal(restored.fleetBases.bases[0].registeredVehicles, 30);
  assert.equal(restored.currentGameSecond, saved.payload.currentGameSecond);
  assert.equal(restored.finance.cashBalanceCents, (await client.snapshot() as any).finance.cashBalanceCents);
});
