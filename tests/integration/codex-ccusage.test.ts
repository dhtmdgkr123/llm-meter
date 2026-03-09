import { describe, expect, test } from 'bun:test';
import { CodexProvider } from '../../src/providers/codex.ts';
import { aggregateDaily } from '../../src/core/aggregator.ts';
import { parseDate } from '../../src/core/date-utils.ts';

interface CcusageModelData {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

interface CcusageDailyEntry {
  date: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  costUSD: number;
  models: Record<string, CcusageModelData>;
}

interface CcusageOutput {
  daily: CcusageDailyEntry[];
  totals: CcusageModelData & { costUSD: number };
}

function parseCcusageDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function runCcusage(from: string, to: string): Promise<CcusageOutput> {
  const proc = Bun.spawn(
    ['pnpm', 'dlx', '@ccusage/codex', '--from', from, '--to', to, '--json'],
    { stdout: 'pipe', stderr: 'pipe' },
  );
  const output = await new Response(proc.stdout).text();
  await proc.exited;

  // Find JSON block (skip warning lines)
  const startIdx = output.indexOf('{');
  if (startIdx === -1) throw new Error('No JSON found in ccusage output');
  return JSON.parse(output.slice(startIdx));
}

const isCI = process.env.CI === 'true';

describe('CodexProvider matches ccusage', () => {
  const FROM = '2026-03-08';
  const TO = '2026-03-09';

  test.skipIf(isCI)('daily token counts match ccusage per-model', async () => {
    // 1. Get ccusage data (standard of truth)
    const ccusage = await runCcusage(FROM, TO);

    // 2. Get llm-meter data
    const provider = new CodexProvider();
    const fromDate = parseDate(FROM);
    const toDate = parseDate(TO);
    toDate.setHours(23, 59, 59, 999);
    const records = await provider.collectRecords(fromDate, toDate);
    const buckets = aggregateDaily(records);

    // 3. Compare per-day, per-model token counts
    // Filter ccusage to only the dates we care about
    const ccusageDays = ccusage.daily.filter(d => {
      const key = parseCcusageDate(d.date);
      return key >= FROM && key <= TO;
    });

    expect(ccusageDays.length).toBeGreaterThan(0);

    for (const ccDay of ccusageDays) {
      const dateKey = parseCcusageDate(ccDay.date);
      const bucket = buckets.find(b => b.period === dateKey);

      expect(bucket).toBeDefined();
      if (!bucket) continue;

      const codexProvider = bucket.providers.get('codex');
      expect(codexProvider).toBeDefined();
      if (!codexProvider) continue;

      // Compare per-model
      for (const [modelName, ccModel] of Object.entries(ccDay.models)) {
        const llmModel = codexProvider.models.get(modelName);
        expect(llmModel).toBeDefined();
        if (!llmModel) continue;

        // ccusage.inputTokens includes cached; llm-meter.inputTokens is non-cached
        // So: llm-meter.inputTokens + llm-meter.cachedInputTokens === ccusage.inputTokens
        const llmRawInput = llmModel.inputTokens + llmModel.cachedInputTokens;
        expect(llmRawInput).toBe(ccModel.inputTokens);

        expect(llmModel.cachedInputTokens).toBe(ccModel.cachedInputTokens);
        expect(llmModel.outputTokens).toBe(ccModel.outputTokens);
        expect(llmModel.reasoningTokens).toBe(ccModel.reasoningOutputTokens);
        expect(llmModel.totalTokens).toBe(ccModel.totalTokens);
      }

      // Compare day totals
      const llmDayRawInput = codexProvider.inputTokens + codexProvider.cachedInputTokens;
      expect(llmDayRawInput).toBe(ccDay.inputTokens);
      expect(codexProvider.cachedInputTokens).toBe(ccDay.cachedInputTokens);
      expect(codexProvider.outputTokens).toBe(ccDay.outputTokens);
      expect(codexProvider.reasoningTokens).toBe(ccDay.reasoningOutputTokens);
      expect(codexProvider.totalTokens).toBe(ccDay.totalTokens);

      // Compare cost (round to 2 decimal places like ccusage)
      const llmCost = Math.round(codexProvider.cost * 100) / 100;
      const ccCost = Math.round(ccDay.costUSD * 100) / 100;
      expect(llmCost).toBe(ccCost);
    }
  }, 180_000); // 3 minute timeout for pnpm dlx
});
