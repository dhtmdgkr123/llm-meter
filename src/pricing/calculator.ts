import type { TokenRecord } from '../core/types.ts';
import { getModelPricing } from './models.ts';

const DEFAULT_TIER_THRESHOLD = 200_000;

function tieredCost(tokens: number, basePer1M: number, threshold: number, tieredPer1M?: number): number {
  if (tokens <= 0) return 0;
  if (tieredPer1M != null && tokens > threshold) {
    const below = threshold;
    const above = tokens - threshold;
    return (below / 1_000_000) * basePer1M + (above / 1_000_000) * tieredPer1M;
  }
  return (tokens / 1_000_000) * basePer1M;
}

export function calculateCost(record: TokenRecord): number {
  const pricing = getModelPricing(record.model, record.provider);
  const threshold = pricing.tierThreshold ?? DEFAULT_TIER_THRESHOLD;

  const inputCost = tieredCost(record.inputTokens, pricing.inputPer1M, threshold, pricing.inputPer1MAboveTier);
  const outputCost = tieredCost(record.outputTokens, pricing.outputPer1M, threshold, pricing.outputPer1MAboveTier);
  const cachedCost = tieredCost(record.cachedInputTokens, pricing.cachedInputPer1M, threshold, pricing.cachedInputPer1MAboveTier);
  const cacheCreationCost = pricing.cacheCreationPer1M
    ? tieredCost(record.cacheCreationTokens, pricing.cacheCreationPer1M, threshold, pricing.cacheCreationPer1MAboveTier)
    : 0;

  return inputCost + outputCost + cachedCost + cacheCreationCost;
}
