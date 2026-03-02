import { describe, expect, test } from 'bun:test';
import { ClaudeProvider } from '../../src/providers/claude.ts';
import { join } from 'node:path';

const fixturesDir = join(import.meta.dir, '..', 'fixtures', 'claude');

describe('ClaudeProvider', () => {
  const provider = new ClaudeProvider(fixturesDir);

  test('parses session JSONL and returns correct records', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-02T23:59:59Z'),
    );

    expect(records.length).toBe(3);
    expect(records[0]!.provider).toBe('claude');
  });

  test('extracts correct token counts from assistant records', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-01T23:59:59Z'),
    );

    expect(records.length).toBe(2);

    const first = records[0]!;
    expect(first.model).toBe('claude-sonnet-4-6');
    expect(first.inputTokens).toBe(100);
    expect(first.outputTokens).toBe(30);
    expect(first.cachedInputTokens).toBe(200);
    expect(first.cacheCreationTokens).toBe(50);
    expect(first.totalTokens).toBe(380);

    const second = records[1]!;
    expect(second.inputTokens).toBe(150);
    expect(second.outputTokens).toBe(50);
    expect(second.cachedInputTokens).toBe(300);
    expect(second.cacheCreationTokens).toBe(0);
  });

  test('filters by date range', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-02T00:00:00Z'),
      new Date('2026-03-02T23:59:59Z'),
    );

    expect(records.length).toBe(1);
    expect(records[0]!.model).toBe('claude-haiku-4-5-20251001');
  });

  test('returns empty for out-of-range dates', async () => {
    const records = await provider.collectRecords(
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z'),
    );

    expect(records.length).toBe(0);
  });
});
