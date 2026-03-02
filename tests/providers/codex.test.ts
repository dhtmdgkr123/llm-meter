import { describe, expect, test } from 'bun:test';
import { CodexProvider } from '../../src/providers/codex.ts';
import { join } from 'node:path';

const fixturesDir = join(import.meta.dir, '..', 'fixtures', 'codex');

describe('CodexProvider', () => {
  const provider = new CodexProvider([fixturesDir]);

  test('parses per-event deltas using last_token_usage and deduplicates', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-01T23:59:59Z'),
    );

    // 2 turns × 2 duplicate events each → 2 records after dedup
    expect(records.length).toBe(2);

    // Turn 1: last_token_usage = {input:500, cached:200, output:100, reasoning:50}
    const r1 = records[0]!;
    expect(r1.provider).toBe('codex');
    expect(r1.model).toBe('gpt-5.3-codex');
    expect(r1.inputTokens).toBe(300);         // 500 - 200 (non-cached)
    expect(r1.cachedInputTokens).toBe(200);
    expect(r1.outputTokens).toBe(100);
    expect(r1.reasoningTokens).toBe(50);
    // totalTokens = nonCachedInput + output + cached (consistent with Claude)
    expect(r1.totalTokens).toBe(600);          // 300 + 100 + 200

    // Turn 2: last_token_usage = {input:700, cached:600, output:200, reasoning:70}
    const r2 = records[1]!;
    expect(r2.inputTokens).toBe(100);          // 700 - 600 (non-cached)
    expect(r2.cachedInputTokens).toBe(600);
    expect(r2.outputTokens).toBe(200);
    expect(r2.reasoningTokens).toBe(70);
    expect(r2.totalTokens).toBe(900);          // 100 + 200 + 600

    // Sum should match final cumulative total
    const sumInput = r1.inputTokens + r2.inputTokens;
    const sumCached = r1.cachedInputTokens + r2.cachedInputTokens;
    const sumOutput = r1.outputTokens + r2.outputTokens;
    expect(sumInput).toBe(400);                // 1200 - 800
    expect(sumCached).toBe(800);
    expect(sumOutput).toBe(300);
  });

  test('returns empty for out-of-range dates', async () => {
    const records = await provider.collectRecords(
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z'),
    );

    expect(records.length).toBe(0);
  });
});
