# Bring your routine

A plain-language guide to what the import screen does today. It covers `parseRoutine`, `setsReps` and `matchExercise` in `src/engine/parse.js` and the preview and save flow in `src/app/import.js`. Nothing here is a plan; it describes the current code.

You can get text in three ways: type or paste it, copy it out of a photo with the phone's Live Text, or dictate it. All three end up as text in the same box, and **Read my routine** parses it. If no exercises are found you get a message and stay on the text screen.

## Sets and reps

`setsReps` reads one line. Case does not matter.

| You write | Result |
|---|---|
| `3x8` | 3 sets of 8 |
| `3 x 8-10` | 3 sets of 8 to 10 |
| `4 sets of 6-8` | 4 sets of 6 to 8 |
| `3 by 10` | 3 sets of 10 |
| `3×8` (multiplication sign) | same as `x`: 3 sets of 8 |
| `3 sets 10 reps` | 3 sets of 10 |
| `8-12 reps` | reps only (8 to 12), no set count |
| `3 sets` | sets only, no reps |

Number words are turned into numbers first: one to twenty, plus "twenty five" and "thirty". So `three by eight` is 3 sets of 8. `8 to 10` is read as `8-10`. Long dashes are treated as a hyphen.

### Defaults, and what saving does to the numbers

- A line with no set count gets **3 sets**.
- A single rep target such as `3x10` becomes the range **10 to 12** when saved, because double progression needs a range to climb through. The preview already shows the 10–12.
- A line with no reps (or an invalid range, such as the low number being 0 or above the high number) uses the exercise's **library rep range**.
- Sets are limited to **1 to 10** when saved.

## Day headings

A line is a heading when it is one of these:

- A day word on its own, or with `day`, a letter (a to d) or a number: `Push`, `Push day`, `Push A`, `Upper 1`, `Monday`. Day words are push, pull, leg(s), upper, lower, full body, chest, back, shoulders, arms, core, triceps/tris, biceps/bis, and weekday names (full or three-letter).
- `Upper Body`, `Lower Body` or `Full Body`.
- `Day 2`, or `Day 2 - Back` (a short label after the number), `Week 1 Day 1`, `Session 1`.
- `Workout A`, `Workout B` or `Workout A/B`. The words "A or B" with `or` are not recognized as a heading.
- Two day or muscle words joined by `and`, `&`, `+` or `/`: `Chest & Triceps`, `Back and Biceps`. The connector is required; `Chest Triceps` is not a heading.
- A heading before a colon with an exercise after it: `Push: bench 3x8` makes the heading and the exercise.

Lines before any heading go into a day named **Day 1**. A phrase like `Back squat` or `Chest press` is an exercise, not a heading. Heading text is title-cased, and days with no exercises are dropped.

## How text is split into lines

- Lines break on new lines, semicolons, bullets (`•`, `·`) and a comma followed by a word.
- Dictation is split on `then`, `and then`, `after that` and `next`, and around `push day`, `pull day`, `leg day` and similar (also upper, lower, chest, back, shoulder, arm and full body day).
- Leading list markers (`-`, `*`, `1.`, `1)`) and superset labels such as `A1.` or `A2)` are removed.

## Matching an exercise

First, shorthand is expanded. Examples:

| Written | Becomes |
|---|---|
| `db`, `bb` | dumbbell, barbell |
| `ohp` | overhead press |
| `rdl`, `sldl` | romanian deadlift |
| `pull ups`, `push ups` | pull-up, push-up |
| `pushdowns` | cable pushdown |
| `lat raises` | lateral raise |
| `hammer curls` | dumbbell curl |
| `skull crushers` | skull crusher |
| `seated rows` | seated cable row |
| `bench` on its own | bench press |

Then the words left after removing sets and reps are compared with every library exercise name by word overlap. Each match gets a confidence from 0 to 1: your words found in the name count most, how much of the name you covered breaks ties, and exercises that need equipment you don't have are marked down.

A line with **no sets and no reps** is kept only if it matches with confidence **0.6 or more**. Otherwise it is treated as a note and dropped (for example `warm up 10 min bike`).

## Worked examples

The app's own example:

```
Push
Bench press 4x6-8
Incline DB press 3x10
Lateral raises 4x15
Tricep pushdowns 3x12
```

One day, **Push**, with Barbell bench press, Incline dumbbell press, Dumbbell lateral raise and Cable pushdown. All are confident.

`ohp 3x8, rdl 3x10, hammer curls 3 x 12` on one line gives three exercises in a day named Day 1: Overhead press, Romanian deadlift and Dumbbell curl.

Dictated: `push day bench three by eight then incline press three by ten then dips next lateral raise 4x15` gives a day **Push Day** with four exercises: Barbell bench press (3×8), Incline barbell press (3×10), Dip (no reps, so the library range is used) and Dumbbell lateral raise (4×15).

`zercher squat 3x8` is a best guess: Back squat, confidence below 0.6. `mystery move 3x10` is not recognized.

## The preview

- A line with no match shows **Not recognized: tap to choose**.
- A match below 0.6 shows the guess with **best guess, tap to check** and a **Looks right** button.
- The header counts how many lines need checking ("N to check"), or says everything matched.
- Tap a line to pick a different exercise. **Looks right** accepts the guess.
- You can rename days, remove lines (a day with no lines disappears) and go back to edit the text.

## Saving (read this)

**Use this routine** warns only about lines that matched **no** exercise; those are left out. Best guesses you did not check are saved as the guessed exercise, **with no warning**. Check the "to check" count before saving.

Saving:

- replaces your current routine, after a confirmation (only asked if you already have one);
- keeps your training log;
- switches the split to your own routine;
- raises days per week to the number of days if it is lower (at most 7).

## Dictation privacy

The **Speak** button uses your browser's speech service (Apple or Google) to turn audio into text. Nothing else leaves your device. The button only appears if the browser supports speech recognition; otherwise use the keyboard's microphone.
