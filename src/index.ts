import { Command } from 'commander';
import { dailyCommand } from './cli/commands/daily.ts';
import { monthlyCommand } from './cli/commands/monthly.ts';

const program = new Command()
  .name('llm-meter')
  .description('Analyze local LLM token usage across Claude Code, Codex CLI, and Gemini CLI')
  .version('0.1.0');

program.addCommand(dailyCommand, { isDefault: true });
program.addCommand(monthlyCommand);

program.parse();
