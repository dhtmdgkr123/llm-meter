import { describe, expect, test } from 'bun:test';
import { GeminiProvider } from '../../src/providers/gemini.ts';
import { join } from 'node:path';

const fixturesDir = join(import.meta.dir, '..', 'fixtures', 'gemini');

describe('GeminiProvider', () => {
  const provider = new GeminiProvider(fixturesDir);

  test('parses session JSON and extracts gemini messages', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-01T23:59:59Z'),
    );

    expect(records.length).toBe(2);
    expect(records[0]!.provider).toBe('gemini');
  });

  test('extracts correct token counts including thoughts', async () => {
    const records = await provider.collectRecords(
      new Date('2026-03-01T00:00:00Z'),
      new Date('2026-03-01T23:59:59Z'),
    );

    const first = records[0]!;
    expect(first.model).toBe('gemini-2.5-pro');
    expect(first.inputTokens).toBe(50);
    // output = output + thoughts
    expect(first.outputTokens).toBe(25);
    expect(first.cachedInputTokens).toBe(10);
    expect(first.reasoningTokens).toBe(5);
    expect(first.totalTokens).toBe(85);

    const second = records[1]!;
    expect(second.inputTokens).toBe(100);
    expect(second.outputTokens).toBe(90);
    expect(second.cachedInputTokens).toBe(30);
    expect(second.totalTokens).toBe(225);
  });

  test('returns empty for out-of-range dates', async () => {
    const records = await provider.collectRecords(
      new Date('2025-01-01T00:00:00Z'),
      new Date('2025-01-02T00:00:00Z'),
    );

    expect(records.length).toBe(0);
  });
});
