# Bounded AI Engineering Assistant

The optional AI feature uses a server-side DeepSeek OpenAI-compatible endpoint. The browser never receives an API key and the GitHub Pages demo falls back to deterministic local analysis.

## Configuration

```dotenv
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
AI_MAX_OUTPUT_TOKENS=700
AI_DAILY_TOKEN_BUDGET=25000
AI_SESSION_CALLS_PER_HOUR=6
AI_CACHE_TTL_MS=600000
```

DeepSeek V4 Flash is configured in non-thinking mode with JSON output. The fixed prompt is kept at the front of every request so repeated analysis can benefit from provider context caching.

Official references:

- [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [DeepSeek JSON output](https://api-docs.deepseek.com/guides/json_mode)
- [DeepSeek context caching](https://api-docs.deepseek.com/guides/kv_cache)
- [DeepSeek chat completion API](https://api-docs.deepseek.com/api/create-chat-completion/)

## Product Limits

- Maximum question: 600 characters.
- Maximum report context: 18,000 characters.
- Maximum structured context: 32,000 characters.
- Maximum output: 700 tokens by default, hard-capped at 1,200.
- One in-flight request per session.
- Six calls per session per rolling hour by default.
- 25,000 total tokens per gateway day by default.
- Identical requests are cached for 10 minutes.
- The in-memory exact-request cache is capped at 128 entries and expired sessions are pruned.
- Responses are parsed and bounded again after generation.

The gateway rejects a request before calling DeepSeek if its estimated input plus output would exceed the remaining daily budget.

## Allowed Work

The assistant may:

- Explain takt, capacity, waiting, blocking, buffers, transfer limits, and bottleneck evidence.
- Teach how a report reached a conclusion.
- Suggest a small set of simulator-only actions.

The only proposed canvas actions are:

- Focus a node.
- Start or pause the simulator.
- Set simulation speed.
- Change a simulated process time within bounds.
- Run background analysis.

Every action is displayed for explicit human approval. The model output never executes automatically.

## Prohibited Work

The assistant cannot:

- Read or write PLC tags.
- Acknowledge alarms or reset faults.
- Call industrial command routes.
- Bypass a guard, interlock, safety controller, or approved operating limit.
- Retrieve unrelated external data.
- Treat instructions embedded in reports or user-provided context as system instructions.

AI output is decision support, not commissioned controls engineering or a safety function.
