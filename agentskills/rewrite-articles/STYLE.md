# Botwin's Daily Wire — Neutral Rewrite Style Guide

This document defines the editorial voice for articles that are rewritten from the
aggregated SQL news library into the `deprop.db` database.

## Core principle

**Every rewrite must be neutral, propaganda-free, and non-partisan.** The reader
should finish the article believing they were given facts, not a cause to join.

## Tone and ambition

Write at the level of a **Pulitzer Prize-winning wire-service reporter**:

- Precise, plain, and confident.
- No sensationalism, no slogans, no editorial asides.
- The story is the story. The writer disappears.

## What to remove

Strip the following from the source material:

- Loaded adjectives and adverbs that imply a verdict (`disastrous`, `heroic`,
  `shamefully`, `finally`, `admitted`, `claimed` when used to cast doubt).
- Partisan framing, culture-war signals, and us-vs-them language.
- Unattributed assertions of motive or intent (`to distract from...`,
  `in a bid to...` unless the source itself states the motive).
- Euphemisms, slogans, talking points, and party/brand talking-head quotes.
- Rhetorical questions, exclamation points, and ALL CAPS emphasis.
- Excessive direct quotes from clearly biased sources; paraphrase with
  attribution when a quote is propaganda rather than information.

## What to keep and strengthen

- The newsworthy event or finding.
- Named, verifiable actors and institutions.
- Specific numbers, dates, locations, and document names.
- Direct quotes that add factual substance or necessary human context.
- Competing factual claims, each attributed to its source.

## Structure

Use classic inverted-pyramid reporting:

1. **Lead paragraph:** one or two sentences covering who, what, when, where,
   and why it matters. No throat-clearing.
2. **Context paragraph:** background needed to understand the event.
3. **Body:** details, reactions, and conflicting accounts in order of
   descending importance.
4. **Closing:** forward-looking fact or unresolved question, not a verdict.

## Attribution rules

- Attribute any claim that is contested, predictive, or interpretive.
- Prefer `according to [named source]` over `sources say` whenever possible.
- Distinguish between verified facts (`The report stated...`) and attributed
  claims (`Officials said...`, `Analysts argued...`).
- If a source is biased, label it by its role, not as a slur:
  `the government-backed outlet reported` is acceptable; `the regime's mouthpiece`
  is not.

## Language

- Active voice, short sentences, concrete nouns.
- One idea per sentence; one theme per paragraph.
- Avoid jargon; if technical language is necessary, define it.
- Use `said` for statements. Avoid `slammed`, `blasted`, `praised`, `insisted`
  unless the emotional content is itself newsworthy and attributed.

## Headlines

- Factual, specific, and free of loaded words.
- Summarize the main event, not the most provocative angle.
- Example rewrite:
  - Source: `Catastrophic Biden Policy Wrecks Economy, Experts Warn`
  - Rewrite: `Inflation Rose 0.3% in May, Labor Department Reports`

## Categories

Preserve the normalized category assigned to the original article. Do not
recategorize a story to fit a narrative. Allowed categories mirror the news
aggregation schema (e.g., `world`, `politics`, `business`, `technology`,
`science`, `culture`, `crypto`, `war`, `weather`).

## Output

Produce a clean article object with the same shape as the source row, replacing
`title`, `summary`, and `content` with the neutral rewrite. Keep the original
`url`, `publishedAt`, `imageUrl`, `author`, `source`, `category`, and
`language` fields unchanged unless correcting a factual error.

## Golden rule

If a sentence cannot be defended with evidence that appears in the article or in
the cited source, remove it or rewrite it with proper attribution.
