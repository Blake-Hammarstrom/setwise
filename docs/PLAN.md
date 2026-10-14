# How Setwise builds your weekly plan

This explains what the generator does today (`planWeek` and `suggestFits` in `src/engine/generator.js`) and what the shortfall messages mean. It describes current behavior only. Your own routine is never generated; see `docs/IMPORT.md` and the routine editor for that.

## Weekly targets

Targets are hard sets per muscle per week. The ranges are a coaching convention, as `docs/SPEC.md` says, not a measured law. Intermediate (`BASE_TARGETS`):

| Muscle | Range | Muscle | Range |
|---|---|---|---|
| Chest | 12-18 | Biceps | 8-14 |
| Lats | 10-16 | Triceps | 8-14 |
| Upper back | 10-16 | Quads | 12-18 |
| Front delts | 0-12 | Hamstrings | 10-16 |
| Side delts | 10-18 | Glutes | 8-16 |
| Rear delts | 6-12 | Calves | 6-12 |
| | | Abs | 6-12 |

Beginners get 0.7 times these, advanced 1.2 times, each end rounded. Chest is 8-13 for a beginner and 14-22 for an advanced lifter.

## Counting

- A set counts 1 for each primary muscle and 0.5 for each secondary one (`credit` in `src/engine/exercises.js`).
- The plan aims 40% of the way into each range (minimum + 0.4 x (maximum - minimum)).
- No muscle gets more than 10 counted sets in one session.
- The week may exceed a muscle's maximum by at most 2.
- Front delts have a minimum of 0, so they can never be short.

## Splits and days

| Split | Days offered |
|---|---|
| Full body | 2, 3 or 4 |
| Upper / lower | 2 or 4 |
| Push / pull / legs | 3 or 6 |
| Body-part | 5 |

On the Pick your routine screen (`src/app/onboarding.js`), the routines offered for your days are sorted by fewest short muscles first. Ties go in the order push/pull/legs, upper/lower, full body, body-part. A **Recommended** badge appears only when the top routine covers every muscle. Each card shows either **Covers every muscle** or **Short on** followed by up to three muscles (with an ellipsis if there are more) and the plain reason of the first one.

## The time model

- A main lift set takes about 3 minutes, another compound exercise 2.5, an isolation exercise 2.
- Each session adds 5 minutes of warm-up, plus 2 more per main lift.
- Main lifts may use at most half the session.
- Session lengths offered are 45, 60, 75 and 90 minutes.

Main lifts are chosen first for the whole week, then accessories fill each muscle's share of what is left. If the time can't fit every share, all shares shrink in proportion.

## Shortfalls

A muscle is short when its planned weekly sets fall below its minimum. Each short muscle carries one or more reasons, shown in plain language by `src/app/ui.js`:

| Reason in the engine | What you see |
|---|---|
| split frequency | trained once a week |
| equipment | no exercise for it with your kit |
| equipment variety | only one exercise for it with your kit |
| per-session ceiling | 10-set limit per session |
| time | session length |
| split | not in this split |
| selection | the planner couldn't fit it |

Split frequency is flagged when the days that train the muscle times 10 can't reach its minimum. Equipment variety is only given when nothing else explains the shortfall. Selection is the fallback when no other reason applies. A card shows one reason, the first match in the table order above, so a muscle with both time and equipment reasons shows the equipment text.

## Worked examples (intermediate, block 0)

- **Commercial gym, push pull legs 6 days, 60 min:** no shortfalls.
- **Home gym, push pull legs 3 days, 60 min:** short on chest (9.5 of 12, time and split frequency), side delts (8.5 of 10), quads (7 of 12, time and split frequency), hamstrings (6.5 of 10), calves (5 of 6) and abs (5 of 6). Side delts, hamstrings, calves and abs are short for time only.
- **Bodyweight, full body 3 days, 60 min:** 8 short muscles, including side delts at 5 of 10 for time and equipment.
- **Commercial gym, full body 2 days, 60 min:** short on 10 muscles, all for time.

## Rotation

Only generated plans rotate; your own routine never does. The block number (`block` in `src/app/state.js`) is the number of whole 28-day periods since you started, never below 0. `sessionsOf` regenerates the plan with that block, then applies your permanent swaps.

The block seeds the tie-breaks between similar exercises. Accessory tie-breaks change every block. Main-lift tie-breaks change every 2 blocks, so main lifts stay for at least 8 weeks. A new seed only changes a pick when the scores were close.

Measured: for commercial push pull legs 6 days at 60 minutes, the main lifts are identical in blocks 0, 1 and 2, while the accessories differ between blocks 0 and 1.

## The fit advisor

`docs/VERIFICATION_PROTOCOL.md` says a fit advisor suggests the nearest setups. In the engine, `suggestFits` exists: it keeps the same equipment and experience, tries at most 1 day more or fewer and the same session length or 15 minutes longer (up to 120), keeps the setups with no shortfalls, sorts by minutes then by distance in days, and returns at most 3.

- Home gym, push pull legs 3 days, 60 min: Full body, 4 days, 75 min and Upper / lower, 4 days, 75 min.
- Commercial gym, full body 2 days, 60 min: nothing.

**The app never calls `suggestFits`.** When no routine covers every muscle, the setup screen instead says "Nothing covers every muscle at the chosen length", with generic advice to try a longer session or one more day a week.
