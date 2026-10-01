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
