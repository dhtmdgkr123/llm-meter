import { Command } from 'commander';
import { fromOption, toOption, providerOption, jsonOption, verboseOption } from '../options.ts';
import { collectAllRecords } from './shared.ts';
import { aggregateDaily } from '../../core/aggregator.ts';
import { renderTable } from '../output/table.ts';
import { renderJson } from '../output/json.ts';
import { parseDate, getDefaultFromDate, getDefaultToDate } from '../../core/date-utils.ts';
import type { CliOptions, ProviderId } from '../../core/types.ts';

export const dailyCommand = new Command('daily')
  .description('Show daily token usage and cost')
  .addOption(fromOption)
  .addOption(toOption)
  .addOption(providerOption)
  .addOption(jsonOption)
  .addOption(verboseOption)
  .action(async (opts: CliOptions) => {
    const from = opts.from ? parseDate(opts.from) : getDefaultFromDate();
    const to = opts.to ? parseDate(opts.to) : getDefaultToDate();
    to.setHours(23, 59, 59, 999);
    const providerFilter = opts.provider as ProviderId | undefined;

    const records = await collectAllRecords(from, to, providerFilter);
    const buckets = aggregateDaily(records);

    if (opts.json) {
      console.log(renderJson(buckets));
    } else {
      console.log(renderTable(buckets, opts.verbose));
    }
  });
