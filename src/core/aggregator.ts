import type {
  TokenRecord,
  UsageBucket,
  ProviderUsage,
  ModelUsage,
  UsageTotals,
  ProviderId,
} from './types.ts';
import { formatDateKey, formatMonthKey } from './date-utils.ts';
import { calculateCost } from '../pricing/calculator.ts';

type KeyFn = (date: Date) => string;

function emptyTotals(): UsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    cacheCreationTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    cost: 0,
  };
}

function emptyProviderUsage(provider: ProviderId): ProviderUsage {
  return {
    provider,
    ...emptyTotals(),
    models: new Map(),
  };
}

function emptyModelUsage(model: string): ModelUsage {
  return {
    model,
    ...emptyTotals(),
  };
}

function addToTotals(totals: UsageTotals, record: TokenRecord, cost: number) {
  totals.inputTokens += record.inputTokens;
  totals.outputTokens += record.outputTokens;
  totals.cachedInputTokens += record.cachedInputTokens;
  totals.cacheCreationTokens += record.cacheCreationTokens;
  totals.reasoningTokens += record.reasoningTokens;
  totals.totalTokens += record.totalTokens;
  totals.cost += cost;
}

function aggregate(records: TokenRecord[], keyFn: KeyFn): UsageBucket[] {
  const buckets = new Map<string, UsageBucket>();

  for (const record of records) {
    const key = keyFn(record.timestamp);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        period: key,
        providers: new Map(),
        totals: emptyTotals(),
      };
      buckets.set(key, bucket);
    }

    let providerUsage = bucket.providers.get(record.provider);
    if (!providerUsage) {
      providerUsage = emptyProviderUsage(record.provider);
      bucket.providers.set(record.provider, providerUsage);
    }

    let modelUsage = providerUsage.models.get(record.model);
    if (!modelUsage) {
      modelUsage = emptyModelUsage(record.model);
      providerUsage.models.set(record.model, modelUsage);
    }

    const cost = calculateCost(record);

    addToTotals(bucket.totals, record, cost);
    addToTotals(providerUsage, record, cost);
    addToTotals(modelUsage, record, cost);
  }

  return Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export function aggregateDaily(records: TokenRecord[]): UsageBucket[] {
  return aggregate(records, formatDateKey);
}

export function aggregateMonthly(records: TokenRecord[]): UsageBucket[] {
  return aggregate(records, formatMonthKey);
}
