# Setwise

Daily workouts built for **your** equipment and routine: every muscle covered each week, next weights set from your last session, honest progress. Local-first and installable: your log never leaves the device, and it works offline at the gym.

**Setup in three taps:** where you train → days a week → pick a routine (each card shows whether it covers every muscle) or build your own.

**In the gym:**
- reps and weights prefilled, so a set is one tap
- last time's numbers on every exercise
- warm-up ramps and plates per side for barbell lifts
- a rest timer with vibration
- add or remove sets
- swap with like-for-like alternatives, today only or permanently
- add an exercise, or do a different day
- the screen stays awake

**Your own routine:** name days, search the library or create exercises, set sets and rep ranges, reorder. Coverage is checked live, and progression works the same as for generated plans.

**Progress:**
- estimated-1RM trends with stall flags
- logged sets per muscle vs weekly targets
- editable history
- a backup reminder, plus restore and CSV export of any lift

**Evidence:**
- `docs/VERIFICATION_PROTOCOL.md`: fixed before the generator, plus dated amendments
- `reports/verification.md`: exhaustive over all 384 setups

```
npm test        # progression rules, generator, routines, privacy
npm run verify  # exhaustive generator invariants G1–G7 → reports/
npm run serve   # http://localhost:4177
```
Second Brain project 05. Not medical advice.
