import type { StationId } from "../../contracts/ids/EntityIds.js";
import { DomainError } from "../../core/errors/DomainError.js";
import { err, ok, type Result } from "../../core/result/Result.js";
import { units, type MoneyCents } from "../../core/units/Units.js";
import type { PassengerRoute } from "../route/PassengerRoute.js";
import type { WorldGraph } from "../world/WorldGraph.js";
import type {
  FarePolicy,
  FareRoundingMode
} from "./FarePolicy.js";

export function calculateFareCents(
  route: PassengerRoute,
  originStationId: StationId,
  destinationStationId: StationId,
  graph: WorldGraph,
  policy: FarePolicy
): Result<MoneyCents, DomainError> {
  const override = policy.pairOverrides.find(
    (value) =>
      value.originStationId === originStationId &&
      value.destinationStationId === destinationStationId
  );
  if (override) return ok(override.fareCents);

  const originIndex = route.stopPoints.findIndex(
    (stop) => stop.stationId === originStationId
  );
  const destinationIndex = route.stopPoints.findIndex(
    (stop) => stop.stationId === destinationStationId
  );

  if (originIndex < 0 || destinationIndex <= originIndex) {
    return err(
      new DomainError(
        "INVALID_ARGUMENT",
        "Fare requested for an invalid route OD pair",
        { routeId: route.id, originStationId, destinationStationId }
      )
    );
  }

  const fromBoundary =
    route.stopPoints[originIndex]!.pathLegBoundaryIndex;
  const toBoundary =
    route.stopPoints[destinationIndex]!.pathLegBoundaryIndex;

  let distanceM = 0;
  for (let index = fromBoundary; index < toBoundary; index += 1) {
    const leg = route.pathLegs[index];
    if (!leg) {
      return err(
        new DomainError(
          "ROUTE_INVALID",
          "Fare path boundary exceeds route path",
          { routeId: route.id }
        )
      );
    }

    const road = graph.getRoad(leg.roadSegmentId);
    if (!road) {
      return err(
        new DomainError(
          "REFERENCE_NOT_FOUND",
          "Fare path references a missing road",
          { roadSegmentId: leg.roadSegmentId }
        )
      );
    }

    distanceM += Number(road.lengthM);
  }

  const distanceFare = divideRounded(
    Number(policy.perKmCents) * distanceM,
    1000,
    policy.roundingMode
  );

  let fare = Number(policy.baseFareCents) + distanceFare;
  fare = Math.max(fare, Number(policy.minimumFareCents));

  if (policy.maximumFareCents !== null) {
    fare = Math.min(fare, Number(policy.maximumFareCents));
  }

  fare = roundToIncrement(
    fare,
    policy.roundingIncrementCents,
    policy.roundingMode
  );

  return ok(units.moneyCents(fare));
}

function divideRounded(
  numerator: number,
  denominator: number,
  mode: FareRoundingMode
): number {
  const quotient = numerator / denominator;
  switch (mode) {
    case "floor":
      return Math.floor(quotient);
    case "ceil":
      return Math.ceil(quotient);
    default:
      return Math.round(quotient);
  }
}

function roundToIncrement(
  value: number,
  increment: number,
  mode: FareRoundingMode
): number {
  if (!Number.isSafeInteger(increment) || increment <= 0) {
    throw new Error("Fare rounding increment must be a positive integer");
  }

  return (
    divideRounded(value, increment, mode) * increment
  );
}
