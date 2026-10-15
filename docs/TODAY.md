# The Today screen

Today is the session you are doing. This page describes what the app does now (`src/app/today.js`, `nextIndex` in `src/app/state.js`, `warmups` and `platesPerSide` in `src/engine/routine.js`, `isNewBest` in `src/engine/progression.js`). How the next weight is chosen is in [PROGRESSION.md](PROGRESSION.md); it is not repeated here.

## Which day

- Today offers the next day in your rotation after the last day you logged, wrapping round to the start. With nothing logged, it is day 1.
- Empty days in your own routine are skipped.
- **Other day** lets you pick any day. If the session already has ticked sets, it asks before discarding them.
- The session in progress is saved after every change, so closing the app loses nothing.

## Prefilled numbers

- **Weight:** the prescribed load. It is blank on a first exposure, or 0 for bodyweight work.
- **Reps:**
  - blank on a first exposure;
  - the bottom of the range after *add weight* or *back off*;
  - the top of the range after *level up*;
  - otherwise last time's reps for that set plus 1, capped at the top of the range. If last time had fewer sets, the last set is used. With no last time, it is the bottom of the range.
- Changing the first set's weight copies it to the later sets that are not yet ticked.

## Ticking a set

- A set needs a reps value; without one you get "How many reps?".
- A blank weight is saved as 0.
- Ticking starts the rest timer: the compound rest for compound exercises, the isolation rest for everything else. Defaults are 150 s and 90 s; change them in Settings.
- The timer offers **+30s** and **Skip**. When it reaches zero it vibrates (where supported) and shows "Rest's up", then hides itself about 20 seconds later.
- The screen is kept awake where the browser allows it.

## Warm-ups

Shown only for main lifts loaded with a barbell or dumbbells. They are 40% for 8, 60% for 5 and 80% for 3 of the first set's weight (or the prescribed load if that is empty). Each is rounded to the exercise's increment. A warm-up is kept only if it is:

- at least the bar weight, for barbells (from **Your bar and plates** in Settings); or
- above 0, for dumbbells;
- and in both cases below the working weight.

Examples:

| Working weight | Bar / step | Warm-ups |
|---|---|---|
| 225 lb | 45 lb bar | 90x8, 135x5, 180x3 |
| 95 lb | 45 lb bar | 55x5, 75x3 (40% is 38, which rounds to 40, below the bar) |
| 315 lb | 10 lb step | 130x8, 190x5, 250x3 |
| 20 lb dumbbell | 5 lb step | 10x8, 10x5, 15x3 |

At light weights two warm-ups can round to the same load, as in the dumbbell row.

## Plates per side

Shown for barbell lifts, using your bar and plates (see Settings). Any amount that cannot be made is shown as `(+X short)` per side.

- 225 lb with the standard set: `45 + 45`.
- 192.5 lb with a 45 lb bar and only 45, 25, 10 and 5 lb plates: `45 + 25 (+3.75 short)`.

## Changing the session

- **＋ Set / − Set:** add or remove a set. At least one set always stays. A new set copies the last set's numbers.
- **Add an exercise to today:** adds it for this session only.
- **Swap:** pick a like-for-like alternative, then choose:
  - **Just today:** your routine stays the same.
  - **From now on:** in a generated plan this is saved as a permanent swap (undo it in Settings). In your own routine it replaces the exercise in that day and resets its rep range to the new exercise's library range.

## Finishing

- At least one ticked set is needed ("Tick at least one set first.").
- If some sets are not ticked, it asks whether to finish anyway. Only ticked sets are saved.
- The **Session logged** sheet shows:
  - the number of sets;
  - the minutes since the first change in the session;
  - **New best** for lifts that beat every earlier session in the same mode (see [PROGRESSION.md](PROGRESSION.md)), or a no-new-bests message.
