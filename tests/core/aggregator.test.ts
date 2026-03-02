import { describe, expect, test } from 'bun:test';
import { aggregateDaily, aggregateMonthly } from '../../src/core/aggregator.ts';
import type { TokenRecord } from '../../src/core/types.ts';

function makeRecord(overrides: Partial<TokenRecord> = {}): TokenRecord {
  return {
    provider: 'claude',
    sessionId: 'test-session',
    timestamp: new Date('2026-03-01T10:00:00Z'),
    model: 'claude-sonnet-4-6',
    inputTokens: 100,
    outputTokens: 50,
    cachedInputTokens: 200,
    cacheCreationTokens: 30,
    reasoningTokens: 0,
    totalTokens: 380,
    ...overrides,
  };
}

describe('aggregateDaily', () => {
  test('groups records by date', () => {
    const records = [
      makeRecord({ timestamp: new Date('2026-03-01T10:00:00Z') }),
      makeRecord({ timestamp: new Date('2026-03-01T14:00:00Z') }),
      makeRecord({ timestamp: new Date('2026-03-02T08:00:00Z') }),
    ];

    const buckets = aggregateDaily(records);
    expect(buckets.length).toBe(2);
    expect(buckets[0]!.period).toBe('2026-03-01');
    expect(buckets[1]!.period).toBe('2026-03-02');
  });

  test('sums tokens correctly within a day', () => {
    const records = [
      makeRecord({ inputTokens: 100, outputTokens: 50, totalTokens: 150 }),
      makeRecord({ inputTokens: 200, outputTokens: 100, totalTokens: 300 }),
    ];

    const buckets = aggregateDaily(records);
    expect(buckets[0]!.totals.inputTokens).toBe(300);
    expect(buckets[0]!.totals.outputTokens).toBe(150);
    expect(buckets[0]!.totals.totalTokens).toBe(450);
  });

  test('separates providers within the same day', () => {
    const records = [
      makeRecord({ provider: 'claude', inputTokens: 100 }),
      makeRecord({ provider: 'codex', inputTokens: 200 }),
    ];

    const buckets = aggregateDaily(records);
    expect(buckets[0]!.providers.size).toBe(2);
    expect(buckets[0]!.providers.get('claude')!.inputTokens).toBe(100);
    expect(buckets[0]!.providers.get('codex')!.inputTokens).toBe(200);
  });

  test('tracks per-model usage', () => {
    const records = [
      makeRecord({ model: 'claude-sonnet-4-6', inputTokens: 100 }),
      makeRecord({ model: 'claude-opus-4-6', inputTokens: 300 }),
    ];

    const buckets = aggregateDaily(records);
    const claude = buckets[0]!.providers.get('claude')!;
    expect(claude.models.size).toBe(2);
    expect(claude.models.get('claude-sonnet-4-6')!.inputTokens).toBe(100);
    expect(claude.models.get('claude-opus-4-6')!.inputTokens).toBe(300);
  });

  test('returns sorted buckets', () => {
    const records = [
      makeRecord({ timestamp: new Date('2026-03-03T10:00:00Z') }),
      makeRecord({ timestamp: new Date('2026-03-01T10:00:00Z') }),
      makeRecord({ timestamp: new Date('2026-03-02T10:00:00Z') }),
    ];

    const buckets = aggregateDaily(records);
    expect(buckets.map(b => b.period)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
  });

  test('returns empty array for no records', () => {
    expect(aggregateDaily([])).toEqual([]);
  });
});

describe('aggregateMonthly', () => {
  test('groups records by month', () => {
    const records = [
      makeRecord({ timestamp: new Date('2026-02-15T10:00:00Z') }),
      makeRecord({ timestamp: new Date('2026-03-01T10:00:00Z') }),
      makeRecord({ timestamp: new Date('2026-03-15T10:00:00Z') }),
    ];

    const buckets = aggregateMonthly(records);
    expect(buckets.length).toBe(2);
    expect(buckets[0]!.period).toBe('2026-02');
    expect(buckets[1]!.period).toBe('2026-03');
  });

  test('sums tokens across days in the same month', () => {
    const records = [
      makeRecord({ timestamp: new Date('2026-03-01T10:00:00Z'), inputTokens: 100 }),
      makeRecord({ timestamp: new Date('2026-03-15T10:00:00Z'), inputTokens: 200 }),
      makeRecord({ timestamp: new Date('2026-03-28T10:00:00Z'), inputTokens: 300 }),
    ];

    const buckets = aggregateMonthly(records);
    expect(buckets[0]!.totals.inputTokens).toBe(600);
  });
});
