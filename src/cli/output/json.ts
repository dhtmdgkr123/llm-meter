import type { UsageBucket } from '../../core/types.ts';

function mapToObject<V>(map: Map<string, V>): Record<string, V> {
  const obj: Record<string, V> = {};
  for (const [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

export function renderJson(buckets: UsageBucket[]): string {
  const serializable = buckets.map(bucket => ({
    period: bucket.period,
    providers: mapToObject(
      new Map(
        Array.from(bucket.providers.entries()).map(([id, usage]) => [
          id,
          {
            ...usage,
            models: mapToObject(usage.models),
          },
        ])
      )
    ),
    totals: bucket.totals,
  }));

  return JSON.stringify(serializable, null, 2);
}
