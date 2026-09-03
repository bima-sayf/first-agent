# Implementation plan — chat shell + code-viz knowledge

**Created:** 2026-09-03
**Scope:** three requests — (1) a local chat shell so the bot can be tested without Telegram,
(2) make the bot genuinely knowledgeable about the code-viz project, the triton repos, and the
lineage JSON it generates, with correct code formatting, and (3) make it critical: offer ranked
options instead of answering from assumption when a name does not resolve (Part 3).
**Status:** proposed, not started.
**Tracked as:** TRUST-001 in [`BACKLOGS.md`](BACKLOGS.md) for Part 3.

---

## Part 1 — Chat shell

### Verdict: yes, and it is small

`ask_hermes(user_text, history)` in `src/main.py` is already pure: it takes text plus a history
list, posts to Ollama, appends the reply. Nothing in it touches Telegram. A REPL only needs to call
it in a loop.

### The one real blocker

`src/main.py` calls `validate_environment()` **at module import time** (immediately after the
function definitions, before `main()`). That function hard-requires `BOT_TOKEN`, `TG_API_ID` and
`TG_API_HASH` and calls `sys.exit(1)` when they are missing.

So `from src.main import ask_hermes` cannot work in a shell without full Telegram credentials, even
though the shell will never speak to Telegram. Import-time side effects are the actual problem, not
the validation itself.

### Fix: split the core from the transport

```
src/
├── core/
│   ├── llm.py         ask_llm(), Ollama transport, num_ctx, retries
│   ├── history.py     conversation history (currently an inline dict)
│   └── prompt.py      system prompt assembly
├── telegram_bot.py    the Telethon adapter (today's main.py, minus the core)
└── shell.py           the REPL
```

- move `validate_environment()` so it runs inside each entry point, not at import
- split it into `validate_llm_env()` (Ollama only) and `validate_telegram_env()`; the shell calls
  only the first
- `main.py` stays as a thin shim that runs the Telegram bot, so existing docs and
  `docker-compose.yml` keep working

### Shell features worth having

```bash
python -m src.shell                    # talk to the bot locally
python -m src.shell --no-knowledge     # bypass retrieval, raw model
python -m src.shell --show-context     # print what got injected, and the token estimate
```

- `/reset` clear history · `/history` dump it · `/context` last injected context · `/tools` last
  tool calls and results · `/quit`
- render replies with the same formatter Telegram uses, so formatting bugs surface here first
- `--show-context` matters more than it looks: it is the only cheap way to see truncation coming

### Cost
Low. One refactor, one new file, no new dependencies.

---

## Part 2 — Making the bot knowledgeable

### The corpus, measured

| source | bytes | ~tokens |
|---|---|---|
| `lineage-outputs/catalogs/*.json` (8 files, 777 nodes) | 617 KB | ~154,000 |
| code-viz prose docs (`docs/`, skills, README, AGENT-CONTEXT) | 190 KB | ~47,500 |
| **total** | **~807 KB** | **~200,000** |

### Two hard constraints found while assessing

**1. Ollama silently truncates.** The default context window is 4096 tokens and is overridden with
`OLLAMA_CONTEXT_LENGTH` or a `num_ctx` parameter
([Ollama FAQ](https://docs.ollama.com/faq)). `ask_hermes()` currently sends no `options` block at
all, so it inherits that default. Over-long prompts are cut without an error — you get a confident
answer built on a truncated prompt, which is worse than a failure. Community write-ups on Hermes 3
under Ollama report the same trap, noting the default fills within a couple of tool-calling turns
([markaicode](https://markaicode.com/hermes-agent-token-limit-error-fix/)).
*Content was rephrased for compliance with licensing restrictions.*

**2. 200K tokens does not fit anyway.** Hermes 3 on Llama 3.1 8B advertises a 128K window
([Ollama model page](https://ollama.com/thewindmom/hermes-3-llama-3.1-8b)), but running 128K on an
8B model on CPU — which is what this stack does on macOS, per `PROJECT-CONTEXT.md` — is far too slow
to be conversational, and 200K exceeds it regardless. **Stuffing the whole corpus is not an
option.** Retrieval of some kind is mandatory.

### Option A — static context injection

Hand-write a 2–5K-token project brief into the system prompt: what code-viz is, the layer axis,
node types and id prefixes, the 8 catalogs, the two repos.

- **Good at:** "what is code-viz?", "what are the layers?", "what does the `s:` prefix mean?"
- **Bad at:** anything specific. Cannot answer "what feeds `rev_data_m1`?"
- **Risk:** goes stale silently, exactly the drift problem just cleaned up in code-viz.
- **Cost:** very low.

### Option B — semantic RAG over embeddings

Chunk everything, embed with a local model (`nomic-embed-text` via Ollama), cosine-search top-k.

- **Good at:** fuzzy prose questions across the docs.
- **Bad at, and this is the important part: the lineage graph.** The corpus is full of
  near-identical names — `rev_data_m1`, `rev_data_m2`, `rev_data_avg_l3m`,
  `sum_revenue_data_01m`, `sum_revenue_data_pack_01m`. Embeddings of those chunks sit almost on top
  of each other, so top-k returns a blend of siblings and the model answers confidently from the
  wrong one. Nothing in the output reveals the mistake.

  code-viz's own docs already treat this failure mode as a stop condition: an unresolved column name
  makes `compare_columns.py` exit `2` and refuse to guess, because "a wrong pair yields a complete,
  plausible report and nothing in it reveals the mistake." Semantic search over exact identifiers
  reintroduces precisely the risk that tool was designed to refuse.
- **Cost:** medium. New model pull, an index to build and invalidate, ~150 lines.

### Option C — tool calling over the structured data (recommended core)

The lineage JSON is a **graph with exact ids**, not prose. A column lookup is a dict lookup. Give
the model functions instead of a similarity search:

| tool | returns |
|---|---|
| `list_catalogs()` | 8 catalogs, repo, output table, node count |
| `search_nodes(pattern, type=None)` | exact substring/regex matches on id or name, capped |
| `get_node(node_id)` | one node verbatim: dtype, op, note, snippet, parents |
| `trace_upstream(node_id, depth)` | the ancestor cone, following `parent` |
| `trace_downstream(node_id, depth)` | dependents — "what breaks if I change this" |
| `get_catalog_schema(catalog)` | the produced table's columns |
| `search_docs(query)` | keyword hits in the prose docs with file and heading |

- **Good at:** exactness. Ids either resolve or they do not. When `search_nodes` finds nothing the
  bot says so instead of inventing a column — the same discipline as `--check`.
- **Also good:** tiny per-turn context (one node ≈ 330 chars on average), and it reads the JSON
  live, so it can never go stale.
- **Bad at:** Hermes 3's tool format is strict — an XML-ish `<tool_call>` block that needs the right
  stop tokens, and malformed calls tend to fail quietly
  ([markaicode](https://markaicode.com/hermes-agent-api-error-codes-solutions/)).
  *Content was rephrased for compliance with licensing restrictions.* Budget for a retry-and-repair
  layer and a hard cap on loop iterations.
- **Cost:** medium-high, and the highest value.

### Option D — hybrid: C for the graph, A now and B later for prose

**Recommendation.** Exact tools for anything with an identifier; keyword doc search first, and add
embeddings only if keyword retrieval measurably fails. Do not build a vector store on day one for a
190 KB doc corpus — substring and heading search over 190 KB is fast and has no staleness or
similarity-collapse problem.

### Recommendation summary

| phase | build | why |
|---|---|---|
| 1 | shell + `num_ctx` fix + static brief (A) | unblocks testing; fixes silent truncation; answers "what is this?" |
| 2 | tools over the lineage JSON (C) | the actual ask — exact answers about columns and lineage |
| 3 | keyword doc search, then embeddings only if needed (B) | prose questions, cheapest first |
| 4 | formatting + provenance | correct code blocks, and never presenting guesses as facts |

---

## Formatting (part of the ask: "python code format when asked for snippet")

Measured, so this is settled rather than assumed:

- longest snippet in the corpus: **1168 chars** — well inside Telegram's 4096-char message limit
- snippets containing triple backticks: **0** — so fencing in ```` ```python ```` is safe with no
  escaping
- average snippet: **332 chars**

So per-snippet formatting needs no chunking. What does need care:

- Telethon must be told the parse mode explicitly rather than relying on the default
- a reply that concatenates many nodes *can* exceed 4096 — split on message boundaries, never
  mid-code-block, because a split fence renders as literal backticks
- the shell should reuse the same formatter so a fencing bug shows up locally

---

## Provenance — the thing that must not be skipped

code-viz is not uniformly trustworthy right now, and the bot has to reflect that:

- `agg_revenue_mm_cls` and `agg_revenue_post_mm_cls` were generated from a template **without their
  source scripts**, so their column names are educated guesses. That is the cause of 12 of the 15
  known validator errors.
- 3 catalogs (`cb_profile_mm`, `cb_usage_mtd_rev_trx`, `fea_revenue_scaffold`) are table-level stubs
  with no column lineage.
- the merged graph has 15 known errors.

A bot that answers "`sum_revenue_data_01m` comes from `agg_revenue_mm_cls`" with the same confidence
as a fact drawn from `cb_usage_mm` is actively misleading. Requirements:

- every tool result carries its catalog and, where relevant, a `template: true` or
  `depth: "table"` marker
- the system prompt instructs the model to state when a value comes from a template catalog or a
  stub
- `_metadata.run_date` and `generated_date` are surfaced when snippets with resolved dates are
  quoted, so "why does this say 2026-07-01" has an answer

---

## Phased plan

### Phase 1 — shell and the truncation fix
1. extract `src/core/llm.py`, `history.py`, `prompt.py`; move validation out of import scope
2. split env validation into LLM vs Telegram halves
3. set `num_ctx` explicitly in the Ollama `options` block, from a new `OLLAMA_NUM_CTX` env var
   (suggest 16384 to start; raise only as speed allows). Log the resolved value at startup and log
   an estimated prompt-token count per turn so truncation is visible.
4. add `src/shell.py` with the slash commands above
5. keep `python -m src.main` behaviour identical

**Done when:** the shell holds a conversation with no Telegram credentials present, and startup
prints the context window in use.

### Phase 2 — lineage tools
1. `src/knowledge/lineage.py` — load the 8 JSONs once, index by id and by name, expose the tools
   above as plain Python. Merge on `xref` the way the viewer does, so the bot sees one graph.
2. `src/knowledge/tools.py` — JSON schemas for each tool
3. `src/core/agent.py` — the tool loop: call model → parse `<tool_call>` → execute → feed result
   back → repeat, with an iteration cap and a repair retry on malformed calls
4. point it at code-viz via `CODEVIZ_PATH` env var, defaulting to
   `/Users/salingga/Projects/code-viz`
5. unit-test the tools directly, without the model: exact-hit, no-hit, and cap behaviour

**Done when:** "what feeds `rev_data_m1`?" returns the six real parents including `s:df_prepos`, and
"what feeds `rev_data_m99`?" returns an honest miss rather than a guess.

### Phase 3 — doc search
1. `src/knowledge/docs.py` — index headings and paragraphs across code-viz docs, skills, README,
   AGENT-CONTEXT; keyword and heading match, returning file + heading + excerpt
2. measure it on a fixed question set before considering embeddings
3. only if it falls short: add `nomic-embed-text` embeddings **for prose only**, never for node ids

### Phase 4 — formatting and provenance
1. `src/core/format.py` — fence code as `python`, split long replies on safe boundaries, one
   renderer shared by Telegram and the shell
2. thread provenance markers through every tool result and into the system prompt
3. add a `/whoami`-style capability reply so the bot can state what it does and does not know

---

## Risks

| risk | mitigation |
|---|---|
| silent context truncation | set `num_ctx`; log prompt token estimates; `--show-context` in the shell |
| 8B model handles multi-step tool loops poorly | cap iterations; keep schemas small; degrade to a direct answer with a stated caveat rather than looping |
| Hermes tool-call parse failures | strict parser + one repair retry + explicit stop tokens |
| bot presents template guesses as facts | provenance markers, enforced in the prompt |
| code-viz path missing or moved | `CODEVIZ_PATH` env var; fail loudly at startup, not per query |
| CPU-only inference on macOS is slow | keep injected context small — which the tool approach does by design |
| knowledge goes stale | tools read the JSON live; no build step to forget |

---

## Open decisions for you

1. **Scope of Phase 2 tools** — start with just `search_nodes` / `get_node` / `trace_upstream`, or
   the full seven?
2. **`num_ctx` budget** — 16384 is a reasonable start on CPU. Higher is more capable and slower.
3. **Shell only, or shell plus Telegram from the start?** The core split means both work; the
   question is only where you want to test.
4. **Should the bot ever answer from the model's own knowledge** when tools return nothing, or
   always refuse? Refusing is safer and matches how `compare_columns.py --check` behaves.
5. **Is a read-only bot enough**, or should it eventually run `validate_lineage.py` and report? That
   turns it from a reader into an operator and deserves its own decision.

---

## Sources

- [Ollama FAQ — context window default and override](https://docs.ollama.com/faq)
- [Hermes 3 Llama 3.1 8B on Ollama — 128K context](https://ollama.com/thewindmom/hermes-3-llama-3.1-8b)
- [Hermes 3 token limits under Ollama](https://markaicode.com/hermes-agent-token-limit-error-fix/)
- [Hermes 3 tool-call error modes](https://markaicode.com/hermes-agent-api-error-codes-solutions/)

Corpus sizes, snippet lengths, and the import-time validation blocker were measured directly against
this machine on 2026-09-03, not taken from any source.

---

# Part 3 — Making the bot critical instead of agreeable

**Request:** the bot should watch what I ask, and when I name a column or catalog that is not in the
context, offer options rather than answering from assumption.

## Assessment: this is the highest-value item on the page, and it must not be a prompt

The instinct is to add "do not guess; say you don't know" to the system prompt. That will not hold.
An 8B model under a leading question will comply with the question, not the instruction — and the
failure is invisible, because a fabricated answer about `rev_data_m2` reads exactly like a correct
answer about `rev_data_m1`.

So the guarantee has to be **structural**: code that resolves names before the model is allowed to
generate. The model should never be in a position to invent an identifier, because it never sees a
question containing an unresolved one.

## The precedent already exists in code-viz — reuse it, do not reinvent

`tools/compare_columns.py` solved this exact problem. Two functions matter:

- **`resolve(g, ref, peer=None)`** — turns `catalog.column` into a node id, trying each id prefix
  (`o:`, `d:`, `s:`, `a:`, `f:`, `c:`, `sc:`). Returns `(None, suggestions)` on a miss.
- **`suggest(g, ref, peer=None, limit=8)`** — ranks near-misses.

`suggest()`'s own docstring is the argument for why naive matching is not enough, and it is worth
quoting the reasoning rather than paraphrasing it away: `fea_revenue_sum_revenue_01m` is one token
short of **seven** sibling columns, and the one actually meant (`..._data_01m`) is no closer by
character distance than `..._sms_01m`. So the score blends edit ratio with shared underscore tokens,
boosts the catalog the caller named, prefers a written output column over an intermediate frame, and
— the tiebreaker that actually works — boosts a candidate carrying a distinguishing token the typo
lacks.

And the constraint that matters most, stated in that same docstring: it is **a hint for the human,
not a decision**. The caller still stops and asks.

The CLI enforces this by exiting `2`, writing nothing, and printing the ranked list. The bot needs the
same contract in conversational form.

## Design

### Layer 1 — resolver gate, before generation

```
user message
     │
     ▼
extract identifier-looking tokens          ← snake_case, dotted refs, known catalog names
     │
     ▼
resolve() each one against the merged graph
     │
     ├── all resolve ────────────► inject exact node data, let the model answer
     │
     └── any miss ──────────────► DO NOT GENERATE AN ANSWER
                                   reply with suggest() candidates, ranked, and stop
```

The miss path never reaches the LLM for a factual answer. The model may be used to phrase the
clarification, but it is handed the candidate list and told to present it — not to resolve it.

### Layer 2 — tools return explicit misses, never empty

An empty tool result is an invitation to fill the gap from memory. So every tool returns a status:

```python
{"status": "ok", "node": {...}, "provenance": {...}}
{"status": "no_match", "query": "rev_data_m2", "candidates": [...]}   # ranked, with why
{"status": "ambiguous", "query": "revenue", "matches": [...]}         # too many, narrow it
{"status": "unverified", "node": {...}, "reason": "template catalog"} # exists, but guessed
```

`no_match` must be distinguishable from "the tool broke" and from "the value is null" — three states
that a bare empty list collapses into one.

### Layer 3 — three distinct honest failures

The bot should not say "I don't know" to all of these. They warrant different replies:

| situation | reply |
|---|---|
| close to real names | "No `rev_data_m2`. Did you mean one of these?" + ranked list |
| well-formed, nothing close | "Nothing matching `foo_bar_baz` in the 8 catalogs." + how to list them |
| exists, but in a template catalog | answer, then: "from `agg_revenue_mm_cls`, whose column names are unverified guesses" |
| exists, but a table-level stub | "`cb_profile_mm` has no column lineage — only a table-level node" |
| catalog not generated at all | name the 3 stubs, and that generating it is the fix |

### Layer 4 — observing the conversation

The user asked for the bot to *observe* the chat, not only to answer. Two behaviours:

- **Passive scanning.** Run identifier extraction on every message, even ones that are not questions.
  If someone writes a column name that does not resolve, flag it once, cheaply: "note — no
  `sum_revenue_01m`; closest is `sum_revenue_data_01m`." Typos get caught where they are introduced
  rather than three turns later.
- **Carry the correction.** Once a name is corrected, remember the mapping for the session so the
  same typo is not re-litigated every turn.

### Layer 5 — confidence has to be visible

Every factual claim traces to a node id. Cite it. `o:cb_usage_mm.rev_data_m1` in the reply is both
provenance and something you can grep. If a claim cannot be traced to a node, it should not be
phrased as fact.

## What "critical" should *not* mean

Worth stating, because over-correcting has its own cost:

- do not demand exact ids — resolving `rev_data_m1` to `o:cb_usage_mm.rev_data_m1` is the tool's job
- do not refuse conceptual questions; "what is a boundary node?" needs no identifier
- do not hedge answers that *are* grounded. A node that resolved is a fact; state it plainly
- do not ask for confirmation when exactly one candidate scores far above the rest **and** it is
  reported as a correction rather than assumed silently

## Effort and dependency

Medium, and it depends on Phase 2's tools existing. But the resolver is the cheapest high-value piece
in the whole plan, because `resolve()` and `suggest()` already exist, tested in practice, in
`code-viz/tools/compare_columns.py`. Import them rather than rewriting them — a second
implementation would drift from the first, and then the CLI and the bot would disagree about what a
name means.

## Phase 5 — critical answering

1. `src/knowledge/resolver.py` — import or vendor `resolve()` / `suggest()` from code-viz; wrap them
   over the merged graph
2. `src/knowledge/extract.py` — pull identifier-looking tokens out of free text: dotted
   `catalog.column` refs, bare snake_case that looks like a column, known catalog names. Precision
   matters more than recall here; a false positive nags the user about ordinary English
3. `src/core/gate.py` — the pre-generation gate. On any miss, short-circuit to a candidate reply and
   never call the model for a factual answer
4. status-typed tool results, `no_match` / `ambiguous` / `unverified` distinct from errors
5. session-level correction memory
6. tests that are the actual deliverable:
   - `rev_data_m2` → candidates including `rev_data_m1`, and **no** factual answer
   - `foo_bar_baz` → explicit no-match
   - `sum_revenue_01m` → the seven-sibling case; must not silently pick one
   - a template-catalog column → answer carries the unverified label
   - `rev_data_m1` → answers cleanly, no hedging, cites the node id

**Done when:** asking about a column that does not exist cannot produce a confident answer, and that
property is enforced by a test rather than by the system prompt.

## Suggested build order across the whole plan

Parts 1–3 interleave; this is the order I would actually build in:

| step | what | why here |
|---|---|---|
| 1 | core split + `num_ctx` + shell (Phase 1) | you cannot evaluate any of the rest without a way to talk to it locally |
| 2 | resolver + extractor + gate (Phase 5, partial) | the trust property should exist *before* the bot knows enough to sound authoritative |
| 3 | lineage tools (Phase 2) | now every tool result flows through the gate |
| 4 | doc search (Phase 3) | prose questions |
| 5 | formatting + provenance (Phase 4) | polish, once there is something worth formatting |

Building trust before capability is deliberate. A bot that knows a lot and guesses confidently is
harder to fix later than one that knows less and refuses cleanly, because you stop being able to tell
which of its answers you checked.
