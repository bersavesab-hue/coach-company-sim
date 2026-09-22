import type { RoadClass } from "../../domain/world/RoadSegment.js";
import type { WorldMapContentV1, WorldMapRoadContent } from "./WorldMapContent.js";

export interface RoadNetworkStyleValidationResult {
  readonly valid: boolean;
  readonly issues: readonly string[];
}

const CODE_PREFIX: Readonly<Record<RoadClass, string>> = {
  expressway: "H",
  national_road: "N",
  provincial_road: "P",
  county_road: "C",
  local: "L"
};

const MIN_COUNTS: Readonly<Record<RoadClass, number>> = {
  expressway: 20,
  national_road: 30,
  provincial_road: 30,
  county_road: 10,
  local: 10
};

const MAX_SEGMENT_LENGTH_M: Readonly<Record<RoadClass, number>> = {
  expressway: 520_000,
  national_road: 460_000,
  provincial_road: 380_000,
  county_road: 330_000,
  local: 230_000
};

export function validateFormalRoadNetworkStyle(
  content: WorldMapContentV1
): RoadNetworkStyleValidationResult {
  const issues: string[] = [];
  const nodeById = new Map(
    content.nodes.map((node) => [node.id, node])
  );
  const counts = new Map<RoadClass, number>();
  const codeClass = new Map<string, RoadClass>();
  const codePriority = new Map<string, number>();
  const endpointPairs = new Set<string>();

  for (const road of content.roads) {
    counts.set(
      road.roadClass,
      (counts.get(road.roadClass) ?? 0) + 1
    );

    validateRoadMetadata(
      road,
      codeClass,
      codePriority,
      issues
    );

    const from = nodeById.get(road.fromNodeId);
    const to = nodeById.get(road.toNodeId);
    const pair = [road.fromNodeId, road.toNodeId]
      .sort()
      .join("|");
    if (endpointPairs.has(pair)) {
      issues.push(
        `parallel duplicate road endpoints are not allowed: ${pair}`
      );
    }
    endpointPairs.add(pair);

    if (
      road.lengthM >
      MAX_SEGMENT_LENGTH_M[road.roadClass]
    ) {
      issues.push(
        `${road.id} is too long for ${road.roadClass}: ${road.lengthM}m`
      );
    }

    if (road.roadClass === "expressway") {
      if (
        from?.type !== "junction" ||
        to?.type !== "junction"
      ) {
        issues.push(
          `${road.id} expressway must run interchange-to-interchange`
        );
      }
      if (road.displayPriority !== 1) {
        issues.push(
          `${road.id} expressway must use displayPriority 1`
        );
      }
    }

    if (
      road.roadClass === "provincial_road" &&
      road.displayPriority !== 2
    ) {
      issues.push(
        `${road.id} provincial road must use displayPriority 2`
      );
    }

    if (
      (road.roadClass === "county_road" ||
        road.roadClass === "local") &&
      road.displayPriority !== 3
    ) {
      issues.push(
        `${road.id} county/local road must use displayPriority 3`
      );
    }
  }

  for (const roadClass of Object.keys(
    MIN_COUNTS
  ) as RoadClass[]) {
    const actual = counts.get(roadClass) ?? 0;
    if (actual < MIN_COUNTS[roadClass]) {
      issues.push(
        `${roadClass} needs at least ${MIN_COUNTS[roadClass]} segments; got ${actual}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function assertFormalRoadNetworkStyle(
  content: WorldMapContentV1
): void {
  const result =
    validateFormalRoadNetworkStyle(content);
  if (!result.valid) {
    throw new Error(
      `Invalid formal road network style:\n${result.issues.join("\n")}`
    );
  }
}

function validateRoadMetadata(
  road: WorldMapRoadContent,
  codeClass: Map<string, RoadClass>,
  codePriority: Map<string, number>,
  issues: string[]
): void {
  if (!road.roadCode) {
    issues.push(`${road.id} is missing roadCode`);
    return;
  }
  if (
    !road.roadCode.startsWith(
      CODE_PREFIX[road.roadClass]
    )
  ) {
    issues.push(
      `${road.id} roadCode ${road.roadCode} does not match ${road.roadClass}`
    );
  }
  if (road.displayPriority === undefined) {
    issues.push(
      `${road.id} is missing displayPriority`
    );
  }

  const knownClass = codeClass.get(road.roadCode);
  if (
    knownClass !== undefined &&
    knownClass !== road.roadClass
  ) {
    issues.push(
      `${road.roadCode} mixes road classes`
    );
  }
  codeClass.set(road.roadCode, road.roadClass);

  if (road.displayPriority !== undefined) {
    const knownPriority =
      codePriority.get(road.roadCode);
    if (
      knownPriority !== undefined &&
      knownPriority !== road.displayPriority
    ) {
      issues.push(
        `${road.roadCode} mixes display priorities`
      );
    }
    codePriority.set(
      road.roadCode,
      road.displayPriority
    );
  }
}
