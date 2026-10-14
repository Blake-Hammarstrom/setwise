# How Setwise picks your next weight and reps

A plain-language description of what the code does today (`prescribe`, `increment`, `sessionBest` and `stalled` in `src/engine/progression.js`; `suggestSwap` in `src/engine/routine.js`). The fixed rules R1 to R5 are in [VERIFICATION_PROTOCOL.md](VERIFICATION_PROTOCOL.md). Setwise is a logbook with simple rules, not medical advice.

## What the prescription is based on

- It uses the **most recent logged session of that exercise**, plus the one before it for the back-off rule.
- Sessions with no sets for that exercise are ignored.
- The **working weight is the heaviest set** of the last session.
- The rep range is the one set for that exercise in **your routine**, not the library default.

## The rules, in the order the code checks them

The tag is what the Today screen shows next to the exercise.

1. **First exposure (tag `new`).** No logged sets yet, so no weight is prescribed. The app asks for a weight you could lift for the top of the range with about 2 reps left. (Bodyweight: do the range, stopping about 2 short of failure.)
2. **Bodyweight with no added weight** (see below).
3. **Add weight (tag `add weight`).** Every set of the last session reached the top of the range: next weight is the working weight plus one increment.
4. **Back off (tag `back off`).** Every set of *each* of the last two sessions was below the bottom of the range: next weight is 90% of the working weight, rounded to the nearest increment.
5. **Otherwise (tag `beat reps`).** Keep the weight and add reps until every set reaches the top of the range.

Add weight is checked before back off.

## Increments

| Exercise type | lb | kg |
|---|---|---|
| Barbell, upper body | 5 | 2.5 |
| Barbell, lower body | 10 | 5 |
| Dumbbell | 5 | 2 |
| Cable and machine | 5 | 2.5 |
| Added load on a bodyweight exercise | 5 | 2.5 |

## Worked examples

- Bench press at 135 lb, range 5 to 8, sets of 8, 8, 8: every set hit the top, so **140 lb**.
- Same lift, sets of 8, 8, 7: not every set reached 8, so **hold at 135 lb** and add reps.
- Back squat at 225 lb, two sessions of 4-rep sets (range 5 to 8): back off to 90%, 202.5 rounded to the 10 lb step, so **200 lb**. At 100 kg: 90 rounded to the 5 kg step, so **90 kg**.
- Back squat at 225 lb with every set at 8: **235 lb**.

## Bodyweight exercises

- **No added weight** in the last session: if every set is at the top of the range the tag is `level up` (move to a harder variation or add weight). Otherwise it is `beat reps` at the same load.
- If **any set of the last session had added weight**, the exercise is treated as loaded and follows the normal rules above, progressing by 5 lb or 2.5 kg.

## Stalls

- Each session's score is its best set's estimated one-rep max, using the Epley formula: weight × (1 + reps / 30). For unloaded bodyweight sets the score is the reps.
- A lift is **stalled** when it has at least 5 logged sessions and the best of the last 4 is not higher than the best before them. A tie counts as stalled.
- Bodyweight exercises compare only sessions in the same mode (with or without added weight). Switching mode starts a new baseline.

In the Progress view a stalled lift shows `stalled: try <exercise>`. The suggestion is the first like-for-like alternative available with your equipment: same movement pattern first, then same main muscle. Exercises already in your rotation are skipped. If none fits, it shows just `stalled`.

## Known limitation: back off at light loads

Rounding to the nearest increment can return the same load, so back off does not reduce the weight:

- Dumbbell 15, 20 and 25 lb, and 8 and 10 kg, stay unchanged. For example 20 lb × 0.9 = 18, which rounds to 20 with a 5 lb step.
- 30 lb gives 25, and 12 kg gives 10.

This is current behavior awaiting an owner decision. This document does not change it.

## Where the protocol wording differs from the code

Listed as fact; neither document is changed here.

- **R1, bodyweight.** R1 mentions a +1 rep target. The code keeps the load and says "beat last time's reps" until every set reaches the top, then suggests a harder variation or adding weight.
- **R1, target effort.** R1 mentions the target effort. The app does not record effort.
- **R4, swap.** R4 says same-pattern swap. The code falls back to an exercise for the same main muscle when no same-pattern one is available.
