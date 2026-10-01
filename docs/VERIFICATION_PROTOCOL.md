# Verification protocol

Fixed 2026-10-01, **before the generator was written.** These rules don't change after results are seen. A failure is reported, and fixed under a dated amendment.

## Generator invariants: checked exhaustively over every supported configuration
**Configurations:**
- 4 equipment profiles: commercial · home gym (default kit: barbell, rack, adjustable bench, dumbbells, pull-up bar) · dumbbells + bench · bodyweight (+ pull-up bar)
- 4 splits, with their valid day counts: full body 2–4, upper/lower 2/4, PPL 3/6, body-part 5
- 3 experience levels
- 4 session lengths: 45, 60, 75 and 90 min

| Id | Invariant | Met if |
|---|---|---|
| G1 | **Equipment safety:** no planned exercise needs equipment outside the profile | 0 violations |
| G2 | **Coverage:** at ≥ 60 min with any equipment profile except bodyweight, every muscle with a minimum reaches it in the planned week | 100% of those configurations |
| G3 | **Honest shortfall:** whenever a muscle's planned weekly sets fall below its minimum, *in any configuration*, the plan carries an explicit shortfall entry for that muscle with the reason (time budget or equipment) | 0 silent shortfalls |
| G4 | **Per-session ceiling:** no muscle gets more than 10 fractional sets in one session | 0 violations |
| G5 | **Upper bound:** no muscle's planned weekly sets exceed its maximum by more than 2 | 0 violations |
| G6 | **Determinism:** the same profile and block number give an identical plan; a different block number may change only accessory exercises (main compound lifts stay for 2 blocks) | identical / as specified |

**Reported, not criteria:**
- the coverage rate at 45 min
- the bodyweight profile's shortfalls (expected: e.g. hamstrings and side delts without equipment)

## Progression rules (unit tests)
| Id | Rule |
|---|---|
| R1 | **Double progression:** all working sets at the top of the rep range (at the target effort) → the next session adds one load increment: barbell 5 lb / 2.5 kg upper, 10 lb / 5 kg lower; dumbbell 5 lb / 2 kg; cable or machine 5 lb / 2.5 kg; bodyweight → +1 rep target, then a harder variation |
| R2 | **Hold:** otherwise, keep the load and aim for more reps |
| R3 | **Reduce:** two consecutive sessions with every set below the range's bottom → load −10%, rounded to the increment |
| R4 | **Stall:** no new best estimated 1RM (Epley) in 4 consecutive exposures → flag and suggest a same-pattern swap |
| R5 | **First exposure:** no load is prescribed. The app asks for a weight you could lift for the top of the range with about 2 reps in reserve |

## Product criteria
| Id | Criterion |
|---|---|
| P1 | Deployed, local-first (CSP `connect-src 'none'`); export and import work |
| P2 | The deployed flow, verified at phone width: setup → today's session → log sets → the next session shows progressed loads → progress view |
| P3 | **Real use (owner):** Blake logs at least 12 sessions over at least 4 weeks. Reported: adherence (planned vs logged sessions), weekly volume vs target, and the lifts that progressed or stalled |
| P4 | **Stretch:** one real N-of-1 Lab experiment using Setwise's exported outcome |

## Development record and result (2026-10-01)
**There's no held-out set.** G1–G6 are checked **exhaustively** over the whole configuration space (384 configurations; G2 applies to 216), so the generator was iterated against them directly.

**Iterations, all before the report was written:**
1. **Two-pass planning:** main lifts first, so accessory rotation can't move them (G6).
2. **Time-proportional shares:** no muscle starves while compounds take the whole session.
3. **Fixed a double-counted deficit.**
4. **Pattern and set rules:** up to 2 exercises per pattern, isolation work up to 5 sets, and exercises that credit a needed muscle as a secondary are now considered.
5. **Truthful shortfall reasons:**
   - "time" only when the session's shares were cut to fit, or an exercise didn't fit
   - "selection" when it's the generator's own miss
   - plus "equipment variety" and "split frequency"

**Result (`reports/verification.md`): G1, G3, G4, G5 and G6 MET; G2 NOT MET.**

**G2 as written can't be met, and it isn't moved.** Its misses fall into two groups, by each plan's own stated reason:
- **Structural (54):** splits that train a muscle once a week (3-day PPL, 2-day upper/lower, body-part), where a minimum above the 10-set per-session ceiling (G4) is impossible. Under-training frequency is a real limitation of those splits.
- **Time budget (60):** for example, 2-day full body at 60–75 minutes. The sessions in those plans run at a median 95% of the time available, so time is the actual constraint.
- **The protocol's own G2 and G4 conflicted;** that should have been caught when it was written.

**The product response:**
- every shortfall is shown with its reason (G3: none silent)
- a **fit advisor** suggests the nearest setups (split, ±1 day, +15 min) that meet every minimum

**Remaining generator-only misses:** 1 configuration (commercial / 3-day PPL / advanced / 90 min: rear delts 6.5 of 7).

## Amendment 1 (2026-10-01, from Blake's first use, written BEFORE G7 was run)
**Feedback:** "for PPL need triceps in there". Push days could leave triceps to indirect credit from pressing (fractional sets), and the same could happen to biceps on pull days. That's technically within volume targets, but not what a lifter expects from a push day.

| Id | New invariant | Met if |
|---|---|---|
| G7 | **Direct work:** in every session, each muscle the day is *for* (its focus list, minimum > 0) gets at least one exercise that trains it as a primary mover. Exempt when no available exercise trains it, or when the session has no room for 2 more sets of it (time budget or ceilings) | 0 violations across all 384 configurations |

G1–G6 are unchanged and re-checked.

**Run (amendment 1 as written): G7 met, but G2 misses rose from 114 to 139.**
- Requiring direct work for all 13 focus muscles of *every full-body session* spent the time budget on 2-set fillers instead of efficient compound lifts.

## Amendment 2 (2026-10-01, after the run above; G7's scope changed for full-body days only, so both runs are recorded)
**The change:**
- **Full-body days:** direct work is required **weekly**. Muscle k is assigned to full-body session k mod n; a muscle that doesn't fit there carries over to the next full-body session.
- **Every other day type** (push, pull, legs, upper, lower, body-part) keeps the per-session rule, so **triceps on push day and biceps on pull day are always direct.**
- **The exemption is unchanged:** "no room" means time, the per-session ceiling, or the weekly maximum (G5), consistently.

**Result (`reports/verification.md`): G1, G3, G4, G5, G6 and G7 MET; G2 NOT MET (130).**
- By stated reason: time budget 68 · structural 54 · equipment variety 3 · selection 5.
- **The honest tradeoff:** direct work costs 16 configurations of weekly coverage (114 → 130). It was accepted because it's what a lifter expects from a push or pull day; the user's requirement outranks the volume aim.
