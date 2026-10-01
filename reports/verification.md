# Generator verification (2026-10-01)

Protocol: `docs/VERIFICATION_PROTOCOL.md`. Exhaustive: all 384 supported configurations (G2 applies to 216).

| Id | Invariant | Violations | Verdict |
|---|---|---|---|
| G1 | Equipment safety | 0 | **met** |
| G2 | Coverage (≥ 60 min, equipment profiles) | 114 | **not met** |
| G3 | No silent shortfall | 0 | **met** |
| G4 | Per-session ceiling (≤ 10 sets) | 0 | **met** |
| G5 | Weekly maximum + 2 | 0 | **met** |
| G6 | Determinism; main lifts stable across blocks | 0 | **met** |

**G2 misses by the plan's own stated reason:** time budget: 60 · structural: split trains a muscle once a week, minimum > per-session ceiling: 54.

**Reported:**
- **Configurations at 45 min meeting every minimum:** 7/96.
- **Bodyweight shortfalls** (each is listed in that plan with its reason): Chest 32, Lats 35, Upper back 21, Side delts 94, Triceps 29, Quads 45, Calves 48, Abs 29, Biceps 27, Hamstrings 44, Rear delts 5, Glutes 7.
