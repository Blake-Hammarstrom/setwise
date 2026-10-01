# Setwise (Second Brain project 05)

**Idea:** Blake, 2026-10-01. **Spec:** Project Engine, 2026-10-01.

## Why this project exists
Every project in the portfolio lacks the same thing: **real use with measured outcomes.**
- 311 has no one acting on its list.
- N-of-1 Lab and Recall Radar wait for Blake to use them.
- A training app is the one product Blake will open several times a week, so it's the fastest route to real-use evidence.
- Its logs produce **real outcome data**, an estimated one-rep max per lift. That can feed an [[N-of-1 Lab]] experiment, closing that project's criterion 6 naturally.

**Honest gap mapping:** it doesn't target the Capability Map's top-ranked frameworks. It targets:
- the recurring "real users with measured outcomes" gap
- **verifying a deterministic generator by invariants**, not by eyeballing examples
- [[Choosing Between Rules, Traditional ML, and Generative AI]]: an LLM workout generator was considered and rejected (see Architecture)

## Problem
- **Templates don't fit:** generic programs ignore your equipment, your available days and your session length.
- **Random generators break progression:** "random workout of the day" apps can't support progressive overload, and don't check that every muscle gets enough work.
- **Tracking stays manual:** a spreadsheet records what you did, but doesn't decide what to do next.

## User
Blake first, plus anyone who lifts with a fixed schedule. No other users are claimed.

## Product
1. **Setup, once:**
   - training place: commercial gym · home gym (pick your equipment) · dumbbells only · bodyweight
   - split: full body · upper/lower · push/pull/legs · body-part ("bro") split
   - days per week
   - session length
   - experience level
   - units
2. **Today:** the next session in your rotation. Each exercise has a set count, a rep range and **a load decided by your last performance** (double progression). You log as you go.
3. **Progress:**
   - estimated 1RM trend per lift, smoothed over sessions
   - this week's sets per muscle vs target
   - stall flags, with a suggested swap
4. **Blocks:** exercise selection is stable for 4 weeks so progression works. Accessories rotate at block boundaries or on a stall.
5. **Export** to JSON, including an N-of-1 Lab-ready daily outcome series.

## Architecture (all deterministic; no ML, no LLM)
```
profile → split template → weekly muscle targets (sets/week, fractional counting: primary 1, secondary 0.5)
       → per-session deficits → greedy exercise selection (equipment filter, compound first, coverage score,
         block-seeded tie-break) → set allocation within the session time budget → explicit shortfall report
log → double progression (top of range on all sets → add load; repeated misses → reduce) → stall detection
```
- **Why not an LLM:** "hits everything it's supposed to" is a hard constraint. It's checkable and needs no judgement, so rules are cheaper, faster, private and verifiable.
- **Where the uncertain judgement lives:** only in the volume targets themselves, which are research-informed ranges, not facts. They're shown, labelled, and adjustable.

## Volume targets
- **Weekly hard sets per muscle,** intermediate defaults (beginner ×0.7, advanced ×1.2): about 10–20 for most muscles.
  - **Basis:** dose-response evidence that about 10 or more weekly sets per muscle beats fewer (Schoenfeld, Ogborn & Krieger 2017, meta-analysis).
  - The exact ranges are a coaching convention, stated as such.
- **Front delts** get indirect credit from pressing and have no minimum.
- **Not medical advice.** Progression is conservative.

## Scope cuts
- Cardio and conditioning programming
- Injuries and contraindications (a "skip this exercise" control instead)
- Social features and accounts; sync (export/import instead)
- Video demos
- Nutrition
