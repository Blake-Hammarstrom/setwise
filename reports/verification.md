# Generator verification (2026-10-01)

Protocol: `docs/VERIFICATION_PROTOCOL.md`. Exhaustive: all 384 supported configurations (G2 applies to 216).

| Id | Invariant | Violations | Verdict |
|---|---|---|---|
| G1 | Equipment safety | 0 | **met** |
| G2 | Coverage (≥ 60 min, equipment profiles) | 130 | **not met** |
| G3 | No silent shortfall | 0 | **met** |
| G4 | Per-session ceiling (≤ 10 sets) | 0 | **met** |
| G5 | Weekly maximum + 2 | 0 | **met** |
| G6 | Determinism; main lifts stable across blocks | 0 | **met** |
| G7 | Direct work for every focus muscle (amendment 1) | 0 | **met** |

**G2 misses by the plan's own stated reason:** time budget: 68 · structural: split trains a muscle once a week, minimum > per-session ceiling: 54 · selection: 5 · equipment variety (one exercise trains this with your kit): 3.

**Reported:**
- **Configurations at 45 min meeting every minimum:** 8/96.
- **Bodyweight shortfalls** (each is listed in that plan with its reason): Chest 42, Lats 32, Side delts 96, Biceps 30, Triceps 29, Quads 49, Hamstrings 41, Calves 64, Abs 31, Upper back 22, Rear delts 15, Glutes 20.
