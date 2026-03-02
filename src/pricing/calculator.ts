import type { TokenRecord } from '../core/types.ts';
import { getModelPricing } from './models.ts';

const TIER_THRESHOLD = 200_000;

function tieredCost(tokens: number, basePer1M: number, tieredPer1M?: number): number {
  if (tokens <= 0) return 0;
  if (tieredPer1M != null && tokens > TIER_THRESHOLD) {
    const below = TIER_THRESHOLD;
    const above = tokens - TIER_THRESHOLD;
    return (below / 1_000_000) * basePer1M + (above / 1_000_000) * tieredPer1M;
  }
  return (tokens / 1_000_000) * basePer1M;
}

export function calculateCost(record: TokenRecord): number {
  const pricing = getModelPricing(record.model, record.provider);

  const inputCost = tieredCost(record.inputTokens, pricing.inputPer1M, pricing.inputPer1MAbove200k);
  const outputCost = tieredCost(record.outputTokens, pricing.outputPer1M, pricing.outputPer1MAbove200k);
  const cachedCost = (record.cachedInputTokens / 1_000_000) * pricing.cachedInputPer1M;
  const cacheCreationCost = pricing.cacheCreationPer1M
    ? (record.cacheCreationTokens / 1_000_000) * pricing.cacheCreationPer1M
    : 0;

  return inputCost + outputCost + cachedCost + cacheCreationCost;
}
