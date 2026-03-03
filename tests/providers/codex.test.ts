import { describe, expect, test } from 'bun:test';
import { CodexProvider } from '../../src/providers/codex.ts';
import { join } from 'node:path';

const fixturesDir = join(import.meta.dir, '..', 'fixtures', 'codex');

describe('CodexProvider', () => {
  const provider = new CodexProvider([fixturesDir]);

  test('parses per-event using last_token_usage (matches ccusage, no dedup)', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-01T23:59:59Z'),
    );

    // 2 turns × 2 events each = 4 records (ccusage does not deduplicate)
    expect(records.length).toBe(4);

    // All records should have correct provider and model
    for (const r of records) {
      expect(r.provider).toBe('codex');
      expect(r.model).toBe('gpt-5.3-codex');
    }

    // Turn 1 events (pair): last_token_usage = {input:500, cached:200, output:100}
    expect(records[0]!.inputTokens).toBe(300);    // 500 - 200
    expect(records[0]!.outputTokens).toBe(100);
    expect(records[0]!.cachedInputTokens).toBe(200);
    expect(records[1]!.inputTokens).toBe(300);     // duplicate event, same values
    expect(records[1]!.outputTokens).toBe(100);

    // Turn 2 events (pair): last_token_usage = {input:700, cached:600, output:200}
    expect(records[2]!.inputTokens).toBe(100);    // 700 - 600
    expect(records[2]!.outputTokens).toBe(200);
    expect(records[2]!.cachedInputTokens).toBe(600);
    expect(records[3]!.inputTokens).toBe(100);     // duplicate event, same values

    // Sum of all records (matches ccusage behavior: includes duplicates)
    const sumInput = records.reduce((s, r) => s + r.inputTokens, 0);
    const sumCached = records.reduce((s, r) => s + r.cachedInputTokens, 0);
    const sumOutput = records.reduce((s, r) => s + r.outputTokens, 0);
    expect(sumInput).toBe(800);    // (300+300+100+100)
    expect(sumCached).toBe(1600);  // (200+200+600+600)
    expect(sumOutput).toBe(600);   // (100+100+200+200)
  });

  test('returns empty for out-of-range dates', async () => {
    const records = await provider.collectRecords(
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z'),
    );

    expect(records.length).toBe(0);
  });
});
