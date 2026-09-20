import type { WorldPoint } from "../../domain/world/WorldPoint.js";

export interface SpatialBounds {
  readonly minXM: number;
  readonly minYM: number;
  readonly maxXM: number;
  readonly maxYM: number;
}

interface IndexedPoint<TId extends string, TValue> {
  readonly id: TId;
  readonly point: WorldPoint;
  readonly value: TValue;
  readonly cellKey: string;
}

export class PointSpatialIndex<
  TId extends string,
  TValue
> {
  private readonly cells = new Map<string, Set<TId>>();
  private readonly records = new Map<TId, IndexedPoint<TId, TValue>>();

  constructor(readonly cellSizeM: number) {
    if (!Number.isSafeInteger(cellSizeM) || cellSizeM <= 0) {
      throw new Error("cellSizeM must be a positive safe integer");
    }
  }

  upsert(id: TId, point: WorldPoint, value: TValue): void {
    this.remove(id);

    const cellKey = this.keyForPoint(point);
    let cell = this.cells.get(cellKey);

    if (!cell) {
      cell = new Set<TId>();
      this.cells.set(cellKey, cell);
    }

    cell.add(id);
    this.records.set(id, { id, point, value, cellKey });
  }

  remove(id: TId): void {
    const existing = this.records.get(id);
    if (!existing) return;

    const cell = this.cells.get(existing.cellKey);
    cell?.delete(id);

    if (cell?.size === 0) {
      this.cells.delete(existing.cellKey);
    }

    this.records.delete(id);
  }

  clear(): void {
    this.cells.clear();
    this.records.clear();
  }

  query(bounds: SpatialBounds): readonly TValue[] {
    validateBounds(bounds);

    const minCellX = Math.floor(bounds.minXM / this.cellSizeM);
    const maxCellX = Math.floor(bounds.maxXM / this.cellSizeM);
    const minCellY = Math.floor(bounds.minYM / this.cellSizeM);
    const maxCellY = Math.floor(bounds.maxYM / this.cellSizeM);

    const results: TValue[] = [];

    for (let x = minCellX; x <= maxCellX; x += 1) {
      for (let y = minCellY; y <= maxCellY; y += 1) {
        const cell = this.cells.get(`${x}:${y}`);
        if (!cell) continue;

        for (const id of cell) {
          const record = this.records.get(id);
          if (!record) continue;

          if (
            record.point.xM >= bounds.minXM &&
            record.point.xM <= bounds.maxXM &&
            record.point.yM >= bounds.minYM &&
            record.point.yM <= bounds.maxYM
          ) {
            results.push(record.value);
          }
        }
      }
    }

    return results;
  }

  private keyForPoint(point: WorldPoint): string {
    return (
      `${Math.floor(point.xM / this.cellSizeM)}:` +
      `${Math.floor(point.yM / this.cellSizeM)}`
    );
  }
}

function validateBounds(bounds: SpatialBounds): void {
  if (
    bounds.minXM > bounds.maxXM ||
    bounds.minYM > bounds.maxYM
  ) {
    throw new Error("Spatial bounds min must not exceed max");
  }
}
