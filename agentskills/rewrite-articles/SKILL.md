---
name: rewrite-articles
description: Deploy 5.4-mini codex subagents to rewrite the chunk files in drafts/rewrite_chunks/ and write the results to drafts/rewrite_outputs/.
license: Proprietary
metadata:
  author: Botwin's Daily Wire
  version: "2.0"
---

# Rewrite Articles

Deploy one subagent per chunk file in `drafts/rewrite_chunks/`. Each subagent
rewrites its assigned chunk as neutral, Pulitzer-grade wire copy and writes the
result to `drafts/rewrite_outputs/`. The parent agent monitors every subagent and
handles failures.

## When to use

- User asks for a daily rewrite, de-biased digest, or neutral news brief.
- User says "rewrite today's articles", "run rewrite", or "rewrite chunks".
- After `chunk-articles` and before `review-rewrite`.

## Prerequisites

- Working directory is the repository root.
- `drafts/rewrite_chunks/` exists with chunk files from the latest fetch run.
- `agentskills/rewrite-articles/STYLE.md` is available and must not be modified.

## How to run

This is an agentic step. The parent agent coordinates; subagents do the writing.

### 1. List the chunk files

```bash
ls drafts/rewrite_chunks/
```

Each file is named `{category}-{n}of{m}.md` and contains raw articles from the
latest fetch run.

### 2. Deploy one subagent per chunk

For every chunk file, spawn a subagent with these exact instructions:

```text
Read the chunk file at: drafts/rewrite_chunks/{filename}

Read the style guide at: agentskills/rewrite-articles/STYLE.md

Rewrite every article in the chunk according to the style guide. Produce neutral,
factual, attributed wire copy. Do not recategorize stories. Preserve the original
category, source, and URL for every article.

Write your output to: drafts/rewrite_outputs/{filename}

Use this exact format, with lowercase category headings:

## {lowercase-category}

### [Neutral rewritten headline]

**Source:** original-source-name
**Original:** [original article URL]
**Importance:** {1-10}/10
**Topics:** comma, separated, topic, tags

Neutral rewritten article body.

---

If a chunk contains multiple categories, group the articles under their correct
lowercase category headings. Write only the markdown to the output file.
```

Use the **5.4-mini codex** subagent model if your environment allows model
selection. Otherwise use the default subagent capability.

### 3. Monitor the subagents

- Track every subagent you spawn.
- Wait for all of them to return before continuing.
- If a subagent fails, times out, or returns garbage, redeploy it with the same
  chunk file. If it fails twice, rewrite that chunk yourself.
- Verify each written chunk follows the style guide and the daily.md format.

## Rules

- Do not modify `agentskills/rewrite-articles/STYLE.md`.
- Subagents must write to `drafts/rewrite_outputs/`, not to `drafts/daily.md`.
- Do not commit `drafts/rewrite_outputs/` or `drafts/daily.md`.
- Keep the original URLs so a human can verify the source.
- Category headings must be lowercase (e.g., `## world`, `## politics`).
