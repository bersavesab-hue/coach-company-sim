export interface NamedEntityDto {
  readonly id: string;
  readonly name: string;
}

export interface PageDto<T> {
  readonly items: readonly T[];
  readonly total: number;
}
