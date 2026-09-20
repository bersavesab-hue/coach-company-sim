import type { TripId } from "../../contracts/ids/EntityIds.js";
import type { VisibleVehicleDto } from "../../contracts/dto/MapDto.js";
import type { WorldPoint } from "../../domain/world/WorldPoint.js";
import {
  PointSpatialIndex,
  type SpatialBounds
} from "./PointSpatialIndex.js";

export class VehicleSpatialIndex {
  private readonly index =
    new PointSpatialIndex<TripId, VisibleVehicleDto>(25_000);

  upsert(
    dto: VisibleVehicleDto,
    point: WorldPoint
  ): void {
    this.index.upsert(dto.tripId, point, dto);
  }

  remove(tripId: TripId): void {
    this.index.remove(tripId);
  }

  clear(): void {
    this.index.clear();
  }

  query(bounds: SpatialBounds): readonly VisibleVehicleDto[] {
    return this.index.query(bounds);
  }
}
