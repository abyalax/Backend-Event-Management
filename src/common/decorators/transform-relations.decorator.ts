import { Transform } from 'class-transformer';

export function TransformRelation<T = unknown>(key: string, mapFn: (item: unknown) => T) {
  return Transform(({ obj }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return obj?.[key]?.map(mapFn) || [];
  });
}
