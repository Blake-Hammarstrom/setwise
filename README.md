# Setwise

Daily workouts built for **your** equipment and split that cover every muscle each week, set your next weights from your last session, and track progress honestly. Local-first: your log never leaves the browser.

- **Setup:** commercial gym · home gym (pick your kit) · dumbbells · bodyweight; full body · upper/lower · PPL · body-part split; days per week; session length.
- **Today:** the next session in your rotation, with each lift's load decided by double progression.
- **Progress:** estimated 1RM trends, a stall flag after 4 sessions without a new best, and logged sets per muscle vs weekly targets.
- **Honest coverage:** any muscle a setup can't cover is shown with its reason, and a fit advisor suggests setups that cover everything.

Evidence: `docs/VERIFICATION_PROTOCOL.md` (fixed before the generator) · `reports/verification.md` (exhaustive over 384 configurations).

```
npm test      # unit tests: progression rules R1–R5, generator, privacy
npm run verify  # exhaustive generator invariants G1–G6 → reports/
npm run serve # http://localhost:4177
```
Second Brain project 05. Not medical advice.
