import Table from 'cli-table3';
import chalk from 'chalk';
import type { UsageBucket, ProviderId } from '../../core/types.ts';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

const providerColors: Record<ProviderId, (s: string) => string> = {
  claude: chalk.hex('#D97706'),
  codex: chalk.hex('#10B981'),
  gemini: chalk.hex('#3B82F6'),
};

export function renderTable(buckets: UsageBucket[], verbose: boolean): string {
  if (buckets.length === 0) {
    return chalk.yellow('No data found for the specified date range.');
  }

  const headers = [
    chalk.bold('Period'),
    chalk.bold('Provider'),
    ...(verbose ? [chalk.bold('Model')] : []),
    chalk.bold('Input'),
    chalk.bold('Output'),
    chalk.bold('Cache Create'),
    chalk.bold('Cache Read'),
    chalk.bold('Total'),
    chalk.bold('Cost'),
  ];

  const alignments: ('left' | 'right')[] = [
    'left', 'left',
    ...(verbose ? ['left' as const] : []),
    'right', 'right', 'right', 'right', 'right', 'right',
  ];

  const table = new Table({
    head: headers,
    style: { head: [], border: [] },
    colAligns: alignments,
  });

  let grandTotals = {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    cacheCreationTokens: 0,
    totalTokens: 0,
    cost: 0,
  };

  for (const bucket of buckets) {
    let firstRow = true;

    if (verbose) {
      for (const [providerId, providerUsage] of bucket.providers) {
        const colorFn = providerColors[providerId] ?? chalk.white;
        let firstProviderRow = true;

        for (const [, modelUsage] of providerUsage.models) {
          table.push([
            firstRow ? chalk.bold(bucket.period) : '',
            firstProviderRow ? colorFn(providerId) : '',
            modelUsage.model,
            formatTokens(modelUsage.inputTokens),
            formatTokens(modelUsage.outputTokens),
            formatTokens(modelUsage.cacheCreationTokens),
            formatTokens(modelUsage.cachedInputTokens),
            formatTokens(modelUsage.totalTokens),
            formatCost(modelUsage.cost),
          ]);
          firstRow = false;
          firstProviderRow = false;
        }
      }
    } else {
      for (const [providerId, providerUsage] of bucket.providers) {
        const colorFn = providerColors[providerId] ?? chalk.white;
        table.push([
          firstRow ? chalk.bold(bucket.period) : '',
          colorFn(providerId),
          formatTokens(providerUsage.inputTokens),
          formatTokens(providerUsage.outputTokens),
          formatTokens(providerUsage.cacheCreationTokens),
          formatTokens(providerUsage.cachedInputTokens),
          formatTokens(providerUsage.totalTokens),
          formatCost(providerUsage.cost),
        ]);
        firstRow = false;
      }
    }

    // Period subtotal
    table.push([
      '',
      chalk.dim('total'),
      ...(verbose ? [''] : []),
      chalk.bold(formatTokens(bucket.totals.inputTokens)),
      chalk.bold(formatTokens(bucket.totals.outputTokens)),
      chalk.bold(formatTokens(bucket.totals.cacheCreationTokens)),
      chalk.bold(formatTokens(bucket.totals.cachedInputTokens)),
      chalk.bold(formatTokens(bucket.totals.totalTokens)),
      chalk.bold(formatCost(bucket.totals.cost)),
    ]);

    grandTotals.inputTokens += bucket.totals.inputTokens;
    grandTotals.outputTokens += bucket.totals.outputTokens;
    grandTotals.cachedInputTokens += bucket.totals.cachedInputTokens;
    grandTotals.cacheCreationTokens += bucket.totals.cacheCreationTokens;
    grandTotals.totalTokens += bucket.totals.totalTokens;
    grandTotals.cost += bucket.totals.cost;
  }

  // Grand total row
  table.push([
    chalk.bold.underline('TOTAL'),
    '',
    ...(verbose ? [''] : []),
    chalk.bold.underline(formatTokens(grandTotals.inputTokens)),
    chalk.bold.underline(formatTokens(grandTotals.outputTokens)),
    chalk.bold.underline(formatTokens(grandTotals.cacheCreationTokens)),
    chalk.bold.underline(formatTokens(grandTotals.cachedInputTokens)),
    chalk.bold.underline(formatTokens(grandTotals.totalTokens)),
    chalk.bold.underline(formatCost(grandTotals.cost)),
  ]);

  return table.toString();
}
