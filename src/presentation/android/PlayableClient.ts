import {
  ids,
  type CommandId,
  type RouteId,
  type ServicePlanId,
  type StationId,
  type VehicleDealerId,
  type VehicleId,
  type VehicleListingId
} from "../../contracts/ids/EntityIds.js";
import {
  units,
  type GameSecond
} from "../../core/units/Units.js";
import {
  gameDayAt,
  secondOfDayAt
} from "../../core/time/GameTime.js";
import type { CommandType } from "../../contracts/commands/CommandTypes.js";
import type { CommandEnvelope } from "../../contracts/commands/CommandEnvelope.js";
import type { PassengerRoute } from "../../domain/route/PassengerRoute.js";
import type { ServicePlan } from "../../domain/schedule/ServicePlan.js";
import {
  createPlayableGame,
  PLAYABLE_COMPANY_ID,
  PLAYABLE_FARE_POLICY_ID
} from "../../bootstrap/createPlayableGame.js";

interface UiActionResult {
  readonly ok: boolean;
  readonly message: string;
}

class PlayableClient {
  private readonly runtime = createPlayableGame();
  private currentGameSecond =
    this.runtime.startGameSecond;
  private commandSequence = 1;

  async snapshot() {
    const company = this.runtime.company;
    const gameDay = gameDayAt(
      this.currentGameSecond
    );
    const finance = await this.query(
      "finance.companySnapshot",
      { companyId: company.id }
    );
    const market = await this.query(
      "vehicleMarket.listings",
      {
        currentGameSecond:
          this.currentGameSecond,
        listingKind: null,
        viewerCompanyId: company.id
      }
    );
    const dispatch = await this.query(
      "operations.dispatchCenter",
      {
        companyId: company.id,
        gameDay,
        currentGameSecond:
          this.currentGameSecond
      }
    );
    const world =
      this.runtime.repositories.world.get();
    const activeRegions = world
      .allRegions()
      .filter((region) => region.active);
    const mapBounds = activeRegions.reduce(
      (bounds, region) => ({
        minXM: Math.min(bounds.minXM, region.bounds.minXM),
        minYM: Math.min(bounds.minYM, region.bounds.minYM),
        maxXM: Math.max(bounds.maxXM, region.bounds.maxXM),
        maxYM: Math.max(bounds.maxYM, region.bounds.maxYM)
      }),
      {
        minXM: Number.POSITIVE_INFINITY,
        minYM: Number.POSITIVE_INFINITY,
        maxXM: Number.NEGATIVE_INFINITY,
        maxYM: Number.NEGATIVE_INFINITY
      }
    );
    const visibleVehicles = await this.query(
      "map.visibleVehicles",
      mapBounds
    );
    const routes =
      this.runtime.repositories.allRoutes();
    const plans =
      this.runtime.repositories.allServicePlans();

    return {
      version: "0.18.2-road-hierarchy",
      company,
      currentGameSecond:
        Number(this.currentGameSecond),
      gameDay,
      secondOfDay:
        secondOfDayAt(this.currentGameSecond),
      finance,
      market,
      dispatch,
      visibleVehicles,
      mapBounds,
      stations: this.runtime.stations.map(
        (station) => {
          const node = world.getNode(
            station.worldNodeId
          );
          const mapStation =
            this.runtime.mapContent.stations.find(
              (value) => value.id === String(station.id)
            );
          return {
            id: String(station.id),
            name: station.name,
            stationClass:
              mapStation?.stationClass ?? "county",
            xM: node?.position.xM ?? 0,
            yM: node?.position.yM ?? 0
          };
        }
      ),
      roads: world.allRoads().map((road) => {
        const mapRoad =
          this.runtime.mapContent.roads.find(
            (value) => value.id === String(road.id)
          );
        return {
          id: String(road.id),
          roadClass: road.roadClass,
          roadCode: mapRoad?.roadCode ?? null,
          displayPriority:
            mapRoad?.displayPriority ?? 3,
          showLabel:
            mapRoad?.showLabel ?? false,
          points: road.polyline.map((point) => ({
            xM: point.xM,
            yM: point.yM
          }))
        };
      }),
      routes: routes.map((route) =>
        this.routeDto(route)
      ),
      servicePlans: plans.map((plan) =>
        this.planDto(plan)
      )
    };
  }

  async buyVehicle(
    listingId: string
  ): Promise<UiActionResult> {
    const result = this.dispatch(
      "vehicleMarket.purchaseListing",
      {
        companyId: PLAYABLE_COMPANY_ID,
        listingId:
          ids.vehicleListing(listingId),
        configurationId: null,
        depotStationId:
          this.runtime.company.homeStationId
      }
    );
    return this.actionResult(
      result,
      "车辆已购入，先补能再安排班次。"
    );
  }

  async inspectUsed(
    listingId: string
  ): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "vehicleMarket.inspectListing",
        {
          companyId: PLAYABLE_COMPANY_ID,
          listingId:
            ids.vehicleListing(listingId),
          level: "full"
        }
      ),
      "车辆检测完成。"
    );
  }

  async negotiate(
    listingId: string,
    offerCents: number
  ): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "vehicleMarket.negotiateListing",
        {
          companyId: PLAYABLE_COMPANY_ID,
          listingId:
            ids.vehicleListing(listingId),
          offerPriceCents:
            units.moneyCents(
              Math.max(1, Math.round(offerCents))
            )
        }
      ),
      "议价请求已提交。"
    );
  }

  async createRoute(input: {
    readonly code: string;
    readonly originStationId: string;
    readonly destinationStationId: string;
  }): Promise<UiActionResult> {
    if (
      input.originStationId ===
      input.destinationStationId
    ) {
      return {
        ok: false,
        message: "始发站和终点站不能相同。"
      };
    }

    const created = this.dispatch(
      "route.create",
      {
        companyId: PLAYABLE_COMPANY_ID,
        code: input.code.trim(),
        routeType: "intercity",
        orderedStationIds: [
          ids.station(input.originStationId),
          ids.station(
            input.destinationStationId
          )
        ],
        routingPreference: "fastest_time",
        farePolicyId:
          PLAYABLE_FARE_POLICY_ID,
        requiredLicenseIds: []
      }
    );
    if (!created.ok) {
      return this.actionResult(created, "");
    }

    const route = created.value as PassengerRoute;
    const activated = this.dispatch(
      "route.activate",
      { routeId: route.id }
    );
    return this.actionResult(
      activated,
      `线路 ${route.code} 已开通。`
    );
  }

  async createServicePlan(input: {
    readonly routeId: string;
    readonly vehicleClass: string;
    readonly startHour: number;
    readonly endHour: number;
    readonly intervalMinutes: number;
  }): Promise<UiActionResult> {
    const start = Math.max(
      0,
      Math.min(23, input.startHour)
    ) * 3600;
    const end = Math.max(
      input.startHour + 1,
      Math.min(24, input.endHour)
    ) * 3600;
    const intervalSeconds =
      Math.max(15, input.intervalMinutes) * 60;

    const result = this.dispatch(
      "servicePlan.create",
      {
        routeId: ids.route(input.routeId),
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
              startSecondOfDay: start,
              endSecondOfDay: end,
              intervalSeconds
            }
          ]
        },
        requiredVehicleClass:
          input.vehicleClass
      }
    );

    return this.actionResult(
      result,
      "班次计划已建立。"
    );
  }

  async commitToday(): Promise<UiActionResult> {
    const result = this.dispatch(
      "operations.commitDayPlan",
      {
        companyId: PLAYABLE_COMPANY_ID,
        gameDay: gameDayAt(
          this.currentGameSecond
        ),
        allowPartial: true
      }
    );
    return this.actionResult(
      result,
      "今日运营计划已提交，车辆会按计划自动运行。"
    );
  }

  async replanToday(): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "operations.replanDay",
        {
          companyId: PLAYABLE_COMPANY_ID,
          gameDay: gameDayAt(
            this.currentGameSecond
          )
        }
      ),
      "今日剩余运营已重新排班。"
    );
  }

  async advanceMinutes(
    minutes: number
  ): Promise<UiActionResult> {
    const delta = Math.max(
      1,
      Math.floor(minutes)
    ) * 60;
    const target = units.gameSecond(
      Number(this.currentGameSecond) + delta
    );
    const report =
      this.runtime.app.simulation.advanceTo(
        target,
        () => "foreground"
      );
    this.currentGameSecond = target;

    return {
      ok: report.issues.length === 0,
      message:
        report.issues.length === 0
          ? `时间已推进 ${minutes} 分钟。`
          : `时间已推进，但出现 ${report.issues.length} 个运营问题。`
    };
  }

  async refuelFull(
    vehicleId: string
  ): Promise<UiActionResult> {
    const id = ids.vehicle(vehicleId);
    const vehicle =
      this.runtime.repositories.vehicles.getById(id);
    if (!vehicle) {
      return {
        ok: false,
        message: "车辆不存在。"
      };
    }
    const amount =
      vehicle.energyCapacityUnits -
      vehicle.energyUnits;
    if (amount <= 0) {
      return {
        ok: true,
        message: "车辆能源已经加满。"
      };
    }

    return this.actionResult(
      this.dispatch("vehicle.refuel", {
        vehicleId: id,
        energyUnits: amount
      }),
      "补能任务已经开始。"
    );
  }

  async maintain(
    vehicleId: string
  ): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "vehicle.sendToMaintenance",
        {
          vehicleId: ids.vehicle(vehicleId)
        }
      ),
      "车辆已送入保养。"
    );
  }

  async renewInsurance(
    vehicleId: string
  ): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "vehicle.renewInsurance",
        {
          vehicleId: ids.vehicle(vehicleId)
        }
      ),
      "保险已续期。"
    );
  }

  async passInspection(
    vehicleId: string
  ): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "vehicle.passInspection",
        {
          vehicleId: ids.vehicle(vehicleId)
        }
      ),
      "年检已完成。"
    );
  }

  async sellToDealer(
    vehicleId: string,
    dealerId: string
  ): Promise<UiActionResult> {
    return this.actionResult(
      this.dispatch(
        "vehicleMarket.sellToDealer",
        {
          companyId: PLAYABLE_COMPANY_ID,
          vehicleId: ids.vehicle(vehicleId),
          dealerId:
            ids.vehicleDealer(dealerId)
        }
      ),
      "车辆已出售给车商。"
    );
  }

  private dispatch(
    type: CommandType,
    payload: unknown
  ) {
    const command: CommandEnvelope = {
      commandId: this.nextCommandId(),
      type,
      issuedAtGameSecond:
        this.currentGameSecond,
      actorCompanyId: PLAYABLE_COMPANY_ID,
      payload
    };
    return this.runtime.app.commands.dispatch(
      command
    );
  }

  private async query(
    type: string,
    payload: unknown
  ) {
    const result =
      await this.runtime.app.queries.execute({
        type,
        payload
      });
    if (!result.ok) {
      return {
        error: result.error.code,
        message: result.error.message
      };
    }
    return result.value;
  }

  private nextCommandId(): CommandId {
    return ids.command(
      `command.ui.${String(
        this.commandSequence++
      ).padStart(10, "0")}`
    );
  }

  private actionResult(
    result: ReturnType<
      typeof this.runtime.app.commands.dispatch
    >,
    successMessage: string
  ): UiActionResult {
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.error.message
      };
    }
    return {
      ok: true,
      message: successMessage
    };
  }

  private routeDto(route: PassengerRoute) {
    return {
      id: String(route.id),
      code: route.code,
      status: route.status,
      routeType: route.type,
      stations: route.stopPoints.map(
        (stop) => ({
          id: String(stop.stationId),
          name:
            this.runtime.repositories.stations
              .getById(stop.stationId)
              ?.name ?? String(stop.stationId)
        })
      )
    };
  }

  private planDto(plan: ServicePlan) {
    return {
      id: String(plan.id),
      routeId: String(plan.routeId),
      status: plan.status,
      requiredVehicleClass:
        plan.requiredVehicleClass,
      departurePattern:
        plan.departurePattern
    };
  }
}

const client = new PlayableClient();

(globalThis as unknown as {
  CoachGame: PlayableClient;
}).CoachGame = client;
