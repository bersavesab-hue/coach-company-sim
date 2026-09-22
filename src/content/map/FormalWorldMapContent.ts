import rawWorldMap from "./world-map.v1.json" with { type: "json" };
import type { WorldMapContentV1 } from "./WorldMapContent.js";
import { assertValidWorldMapContent, validateWorldMapContent, type WorldMapValidationResult } from "./WorldMapContentValidator.js";
import { assertFormalRoadNetworkStyle, validateFormalRoadNetworkStyle } from "./RoadNetworkStyleValidator.js";

export const FORMAL_WORLD_MAP_CONTENT = rawWorldMap as unknown as WorldMapContentV1;
assertValidWorldMapContent(FORMAL_WORLD_MAP_CONTENT);
assertFormalRoadNetworkStyle(FORMAL_WORLD_MAP_CONTENT);

export function validateFormalWorldMapContent(): WorldMapValidationResult {
  const base = validateWorldMapContent(FORMAL_WORLD_MAP_CONTENT);
  const style = validateFormalRoadNetworkStyle(
    FORMAL_WORLD_MAP_CONTENT
  );
  return {
    valid: base.valid && style.valid,
    issues: [...base.issues, ...style.issues]
  };
}
