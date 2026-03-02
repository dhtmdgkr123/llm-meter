# llm-meter

A CLI tool that provides unified analysis of local token usage across three AI coding tools: Claude Code, Codex CLI, and Gemini CLI.

All analysis is performed locally — no external API calls.

## Usage

```bash
# Daily usage (default)
pnpm dlx @dhtmdgkr/llm-meter
npx @dhtmdgkr/llm-meter
bunx @dhtmdgkr/llm-meter

# Monthly usage
pnpm dlx @dhtmdgkr/llm-meter monthly

# Specify date range
pnpm dlx @dhtmdgkr/llm-meter daily --from 2026-03-01 --to 2026-03-02

# Filter by provider
pnpm dlx @dhtmdgkr/llm-meter daily --from 2026-03-01 --provider claude

# Per-model breakdown
pnpm dlx @dhtmdgkr/llm-meter daily --from 2026-03-01 --verbose

# JSON output
pnpm dlx @dhtmdgkr/llm-meter daily --from 2026-03-01 --json
```

### Options

| Option | Description |
|--------|-------------|
| `--from <date>` | Start date (YYYY-MM-DD), default: 30 days ago |
| `--to <date>` | End date (YYYY-MM-DD), default: today |
| `--provider <name>` | Filter by provider: `claude`, `codex`, `gemini` |
| `--verbose` | Show per-model breakdown |
| `--json` | Output as JSON |

## Output Examples

### Default Mode

```
┌────────────┬──────────┬────────┬────────┬──────────────┬────────────┬────────┬────────┐
│ Period     │ Provider │  Input │ Output │ Cache Create │ Cache Read │  Total │   Cost │
├────────────┼──────────┼────────┼────────┼──────────────┼────────────┼────────┼────────┤
│ 2026-03-01 │ claude   │  59.7K │ 168.9K │         4.5M │      65.6M │  70.3M │ $33.76 │
├────────────┼──────────┼────────┼────────┼──────────────┼────────────┼────────┼────────┤
│            │ total    │  59.7K │ 168.9K │         4.5M │      65.6M │  70.3M │ $33.76 │
├────────────┼──────────┼────────┼────────┼──────────────┼────────────┼────────┼────────┤
│ 2026-03-02 │ claude   │  26.1K │ 143.3K │         1.9M │      48.5M │  50.5M │ $33.19 │
├────────────┼──────────┼────────┼────────┼──────────────┼────────────┼────────┼────────┤
│            │ codex    │  39.1K │   7.3K │            0 │     514.3K │  46.4K │  $0.39 │
├────────────┼──────────┼────────┼────────┼──────────────┼────────────┼────────┼────────┤
│            │ total    │  65.2K │ 150.6K │         1.9M │      49.0M │  50.6M │ $33.58 │
├────────────┼──────────┼────────┼────────┼──────────────┼────────────┼────────┼────────┤
│ TOTAL      │          │ 124.8K │ 319.5K │         6.4M │     114.6M │ 120.9M │ $67.35 │
└────────────┴──────────┴────────┴────────┴──────────────┴────────────┴────────┴────────┘
```

### Verbose Mode (`--verbose`)

```
┌────────────┬──────────┬───────────────────────────┬───────┬────────┬──────────────┬────────────┬───────┬────────┐
│ Period     │ Provider │ Model                     │ Input │ Output │ Cache Create │ Cache Read │ Total │   Cost │
├────────────┼──────────┼───────────────────────────┼───────┼────────┼──────────────┼────────────┼───────┼────────┤
│ 2026-03-01 │ claude   │ claude-opus-4-6           │ 21.4K │  30.7K │       810.8K │      16.3M │ 17.2M │ $14.10 │
├────────────┼──────────┼───────────────────────────┼───────┼────────┼──────────────┼────────────┼───────┼────────┤
│            │          │ claude-haiku-4-5-20251001 │ 16.7K │  78.9K │         2.2M │      24.0M │ 26.3M │  $5.54 │
├────────────┼──────────┼───────────────────────────┼───────┼────────┼──────────────┼────────────┼───────┼────────┤
│            │          │ claude-sonnet-4-6         │ 21.6K │  59.3K │         1.5M │      25.3M │ 26.9M │ $14.13 │
├────────────┼──────────┼───────────────────────────┼───────┼────────┼──────────────┼────────────┼───────┼────────┤
│            │ total    │                           │ 59.7K │ 168.9K │         4.5M │      65.6M │ 70.3M │ $33.76 │
└────────────┴──────────┴───────────────────────────┴───────┴────────┴──────────────┴────────────┴───────┴────────┘
```

## Data Sources

| Provider | Local Path | Format |
|----------|-----------|--------|
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | JSONL, `message.usage` from `type: "assistant"` records |
| **Codex CLI** | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | JSONL, last `token_count` cumulative value per session |
| **Gemini CLI** | `~/.gemini/tmp/**/session-*.json` | JSON, `tokens` from `type: "gemini"` entries in `messages[]` |

## Pricing Model

Uses [LiteLLM](https://github.com/BerriAI/litellm)-based pricing data (same as ccusage).

| Model | Input $/MTok | Output $/MTok | Cache Create $/MTok | Cache Read $/MTok |
|-------|:-----------:|:------------:|:------------------:|:----------------:|
| Claude Opus 4 | $5.00 | $25.00 | $6.25 | $0.50 |
| Claude Sonnet 4 | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $1.25 | $0.10 |
| GPT-5.3 Codex | $2.00 | $8.00 | - | $0.50 |
| Gemini 2.5 Pro | $1.25 | $10.00 | - | $0.31 |

Tiered pricing applies above 200K tokens (Opus, Sonnet).

## Testing

```bash
bun test
```

## Compatibility with ccusage

The Claude Code portion produces identical results to [ccusage](https://github.com/ryoppippi/ccusage):

- Deduplication based on `message.id:requestId` (handles streaming duplicate records)
- LiteLLM pricing model
- Local timezone-based date grouping
- Includes subagent files

## Project Structure

```
src/
  index.ts                  # CLI entry point
  cli/
    commands/daily.ts       # daily subcommand
    commands/monthly.ts     # monthly subcommand
    commands/shared.ts      # shared data collection logic
    options.ts              # CLI option definitions
    output/table.ts         # terminal table formatter
    output/json.ts          # JSON output formatter
  core/
    types.ts                # shared types
    aggregator.ts           # daily/monthly aggregation
    date-utils.ts           # date utilities
  providers/
    base.ts                 # abstract base class
    claude.ts               # Claude Code parser
    codex.ts                # Codex CLI parser
    gemini.ts               # Gemini CLI parser
    registry.ts             # provider registry
  pricing/
    models.ts               # per-model pricing database
    calculator.ts           # cost calculation (tiered pricing)
tests/
  fixtures/                 # synthetic test data
  providers/                # provider unit tests
  core/                     # aggregation unit tests
```

## License

MIT
