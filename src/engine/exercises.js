// Exercise library. Each exercise lists ALL the equipment it needs, the muscles it trains as primary (counts 1 set)
// and secondary (counts 0.5 set: the usual fractional-set convention), its movement pattern (for like-for-like
// swaps), how its load progresses, and its rep range. "floor" needs nothing.

export const MUSCLES = ["chest", "lats", "upperBack", "frontDelts", "sideDelts", "rearDelts", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "abs"];
export const MUSCLE_NAMES = { chest: "Chest", lats: "Lats", upperBack: "Upper back", frontDelts: "Front delts", sideDelts: "Side delts", rearDelts: "Rear delts", biceps: "Biceps", triceps: "Triceps", quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves", abs: "Abs" };

export const EQUIPMENT = {
  barbell: "Barbell + plates", rack: "Squat rack", bench: "Adjustable bench", dumbbells: "Dumbbells", pullupBar: "Pull-up bar",
  cable: "Cable stack (pulldown, row, crossover)", legPress: "Leg press", legCurl: "Leg curl machine", legExt: "Leg extension",
  machineChest: "Chest press machine", pecDeck: "Pec deck / rear-delt fly", smith: "Smith machine", dipStation: "Dip station", bands: "Resistance bands", kettlebell: "Kettlebell",
};

export const PROFILES = {
  commercial: { label: "Commercial gym", equipment: Object.keys(EQUIPMENT) },
  home: { label: "Home gym", equipment: ["barbell", "rack", "bench", "dumbbells", "pullupBar"] },
  dumbbell: { label: "Dumbbells + bench", equipment: ["dumbbells", "bench"] },
  bodyweight: { label: "Bodyweight", equipment: ["pullupBar"] },
};

// [id, name, equipment, primary, secondary, pattern, load, lower?, tier, reps]
const C = "compound", I = "isolation";
const rows = [
  // chest
  ["bb-bench", "Barbell bench press", ["barbell", "bench", "rack"], ["chest"], ["triceps", "frontDelts"], "horizontal-press", "barbell", false, "main", [5, 8], C],
  ["bb-incline", "Incline barbell press", ["barbell", "bench", "rack"], ["chest", "frontDelts"], ["triceps"], "incline-press", "barbell", false, "main", [6, 10], C],
  ["db-bench", "Dumbbell bench press", ["dumbbells", "bench"], ["chest"], ["triceps", "frontDelts"], "horizontal-press", "dumbbell", false, "main", [8, 12], C],
  ["db-incline", "Incline dumbbell press", ["dumbbells", "bench"], ["chest", "frontDelts"], ["triceps"], "incline-press", "dumbbell", false, "accessory", [8, 12], C],
  ["machine-press", "Machine chest press", ["machineChest"], ["chest"], ["triceps", "frontDelts"], "horizontal-press", "machine", false, "accessory", [8, 12], C],
  ["smith-incline", "Smith incline press", ["smith", "bench"], ["chest", "frontDelts"], ["triceps"], "incline-press", "machine", false, "accessory", [8, 12], C],
  ["cable-fly", "Cable fly", ["cable"], ["chest"], [], "chest-fly", "cable", false, "accessory", [10, 15], I],
  ["pec-deck", "Pec deck", ["pecDeck"], ["chest"], [], "chest-fly", "machine", false, "accessory", [10, 15], I],
  ["db-fly", "Dumbbell fly", ["dumbbells", "bench"], ["chest"], [], "chest-fly", "dumbbell", false, "accessory", [10, 15], I],
  ["dip", "Dip", ["dipStation"], ["chest", "triceps"], ["frontDelts"], "dip", "bodyweight", false, "accessory", [6, 12], C],
  ["pushup", "Push-up", ["floor"], ["chest"], ["triceps", "frontDelts"], "horizontal-press", "bodyweight", false, "main", [8, 20], C],
  ["deficit-pushup", "Feet-elevated push-up", ["floor"], ["chest", "frontDelts"], ["triceps"], "incline-press", "bodyweight", false, "accessory", [8, 20], C],
  ["band-fly", "Band chest fly", ["bands"], ["chest"], [], "chest-fly", "bodyweight", false, "accessory", [12, 20], I],
  // back
  ["pullup", "Pull-up", ["pullupBar"], ["lats"], ["biceps", "upperBack"], "vertical-pull", "bodyweight", false, "main", [5, 10], C],
  ["chinup", "Chin-up", ["pullupBar"], ["lats", "biceps"], ["upperBack"], "vertical-pull", "bodyweight", false, "accessory", [5, 10], C],
  ["lat-pulldown", "Lat pulldown", ["cable"], ["lats"], ["biceps", "upperBack"], "vertical-pull", "cable", false, "main", [8, 12], C],
  ["bb-row", "Barbell row", ["barbell"], ["upperBack", "lats"], ["biceps", "rearDelts"], "horizontal-pull", "barbell", false, "main", [6, 10], C],
  ["db-row", "One-arm dumbbell row", ["dumbbells", "bench"], ["lats", "upperBack"], ["biceps", "rearDelts"], "horizontal-pull", "dumbbell", false, "accessory", [8, 12], C],
  ["chest-supported-row", "Chest-supported dumbbell row", ["dumbbells", "bench"], ["upperBack"], ["lats", "rearDelts", "biceps"], "horizontal-pull", "dumbbell", false, "main", [8, 12], C],
  ["cable-row", "Seated cable row", ["cable"], ["upperBack", "lats"], ["biceps", "rearDelts"], "horizontal-pull", "cable", false, "accessory", [8, 12], C],
  ["straight-arm-pulldown", "Straight-arm pulldown", ["cable"], ["lats"], [], "lat-isolation", "cable", false, "accessory", [10, 15], I],
  ["db-pullover", "Dumbbell pullover", ["dumbbells", "bench"], ["lats"], ["chest"], "lat-isolation", "dumbbell", false, "accessory", [10, 15], I],
  ["inverted-row", "Inverted row (under a table or bar)", ["floor"], ["upperBack"], ["lats", "biceps", "rearDelts"], "horizontal-pull", "bodyweight", false, "main", [8, 15], C],
  ["band-row", "Band row", ["bands"], ["upperBack"], ["lats", "biceps"], "horizontal-pull", "bodyweight", false, "accessory", [12, 20], C],
  ["kb-row", "Kettlebell row", ["kettlebell"], ["lats", "upperBack"], ["biceps"], "horizontal-pull", "dumbbell", false, "accessory", [8, 12], C],
  // shoulders
  ["ohp", "Overhead press", ["barbell", "rack"], ["frontDelts"], ["sideDelts", "triceps"], "vertical-press", "barbell", false, "main", [5, 8], C],
  ["db-ohp", "Seated dumbbell shoulder press", ["dumbbells", "bench"], ["frontDelts"], ["sideDelts", "triceps"], "vertical-press", "dumbbell", false, "accessory", [8, 12], C],
  ["pike-pushup", "Pike push-up", ["floor"], ["frontDelts"], ["triceps", "sideDelts"], "vertical-press", "bodyweight", false, "accessory", [6, 15], C],
  ["db-lateral", "Dumbbell lateral raise", ["dumbbells"], ["sideDelts"], [], "lateral-raise", "dumbbell", false, "accessory", [12, 20], I],
  ["cable-lateral", "Cable lateral raise", ["cable"], ["sideDelts"], [], "lateral-raise", "cable", false, "accessory", [12, 20], I],
  ["band-lateral", "Band lateral raise", ["bands"], ["sideDelts"], [], "lateral-raise", "bodyweight", false, "accessory", [15, 25], I],
  ["upright-row", "Wide-grip upright row", ["barbell"], ["sideDelts"], ["upperBack"], "lateral-raise", "barbell", false, "accessory", [10, 15], C],
  ["rear-delt-fly", "Rear-delt dumbbell fly", ["dumbbells"], ["rearDelts"], ["upperBack"], "rear-delt", "dumbbell", false, "accessory", [12, 20], I],
  ["reverse-pec-deck", "Reverse pec deck", ["pecDeck"], ["rearDelts"], ["upperBack"], "rear-delt", "machine", false, "accessory", [12, 20], I],
  ["face-pull", "Face pull", ["cable"], ["rearDelts", "upperBack"], [], "rear-delt", "cable", false, "accessory", [12, 20], I],
  ["band-pull-apart", "Band pull-apart", ["bands"], ["rearDelts"], ["upperBack"], "rear-delt", "bodyweight", false, "accessory", [15, 25], I],
  ["prone-y-raise", "Prone Y-T raise", ["floor"], ["rearDelts"], ["upperBack", "sideDelts"], "rear-delt", "bodyweight", false, "accessory", [10, 20], I],
  // arms
  ["bb-curl", "Barbell curl", ["barbell"], ["biceps"], [], "curl", "barbell", false, "accessory", [8, 12], I],
  ["db-curl", "Dumbbell curl", ["dumbbells"], ["biceps"], [], "curl", "dumbbell", false, "accessory", [10, 15], I],
  ["incline-curl", "Incline dumbbell curl", ["dumbbells", "bench"], ["biceps"], [], "curl", "dumbbell", false, "accessory", [10, 15], I],
  ["cable-curl", "Cable curl", ["cable"], ["biceps"], [], "curl", "cable", false, "accessory", [10, 15], I],
  ["band-curl", "Band curl", ["bands"], ["biceps"], [], "curl", "bodyweight", false, "accessory", [12, 20], I],
  ["close-grip-bench", "Close-grip bench press", ["barbell", "bench", "rack"], ["triceps", "chest"], ["frontDelts"], "triceps-press", "barbell", false, "accessory", [6, 10], C],
  ["skullcrusher", "Dumbbell skull crusher", ["dumbbells", "bench"], ["triceps"], [], "triceps-ext", "dumbbell", false, "accessory", [10, 15], I],
  ["overhead-db-ext", "Overhead dumbbell extension", ["dumbbells"], ["triceps"], [], "triceps-ext", "dumbbell", false, "accessory", [10, 15], I],
  ["pushdown", "Cable pushdown", ["cable"], ["triceps"], [], "triceps-ext", "cable", false, "accessory", [10, 15], I],
  ["diamond-pushup", "Diamond push-up", ["floor"], ["triceps"], ["chest"], "triceps-press", "bodyweight", false, "accessory", [8, 20], C],
  ["bench-dip", "Bench dip", ["floor"], ["triceps"], ["chest"], "triceps-press", "bodyweight", false, "accessory", [10, 20], C],
  ["band-pushdown", "Band pushdown", ["bands"], ["triceps"], [], "triceps-ext", "bodyweight", false, "accessory", [15, 25], I],
  // legs
  ["back-squat", "Back squat", ["barbell", "rack"], ["quads", "glutes"], ["hamstrings"], "squat", "barbell", true, "main", [5, 8], C],
  ["front-squat", "Front squat", ["barbell", "rack"], ["quads"], ["glutes"], "squat", "barbell", true, "accessory", [5, 8], C],
  ["leg-press", "Leg press", ["legPress"], ["quads"], ["glutes"], "squat", "machine", true, "main", [8, 12], C],
  ["goblet-squat", "Goblet squat", ["dumbbells"], ["quads"], ["glutes"], "squat", "dumbbell", true, "main", [8, 15], C],
  ["bulgarian", "Bulgarian split squat", ["dumbbells", "bench"], ["quads", "glutes"], ["hamstrings"], "lunge", "dumbbell", true, "accessory", [8, 12], C],
  ["bw-bulgarian", "Bodyweight Bulgarian split squat", ["floor"], ["quads", "glutes"], ["hamstrings"], "lunge", "bodyweight", true, "main", [10, 20], C],
  ["walking-lunge", "Dumbbell walking lunge", ["dumbbells"], ["quads", "glutes"], ["hamstrings"], "lunge", "dumbbell", true, "accessory", [10, 15], C],
  ["leg-ext", "Leg extension", ["legExt"], ["quads"], [], "knee-extension", "machine", true, "accessory", [10, 15], I],
  ["sissy-squat", "Sissy squat (supported)", ["floor"], ["quads"], [], "knee-extension", "bodyweight", true, "accessory", [10, 20], I],
  ["rdl", "Romanian deadlift", ["barbell"], ["hamstrings", "glutes"], ["upperBack"], "hinge", "barbell", true, "main", [6, 10], C],
  ["deadlift", "Deadlift", ["barbell"], ["glutes", "hamstrings"], ["quads", "upperBack"], "hinge", "barbell", true, "main", [3, 6], C],
  ["db-rdl", "Dumbbell Romanian deadlift", ["dumbbells"], ["hamstrings", "glutes"], [], "hinge", "dumbbell", true, "main", [8, 12], C],
  ["kb-swing", "Kettlebell swing", ["kettlebell"], ["glutes", "hamstrings"], [], "hinge", "dumbbell", true, "accessory", [12, 20], C],
  ["sl-rdl", "Single-leg Romanian deadlift (bodyweight)", ["floor"], ["hamstrings", "glutes"], [], "hinge", "bodyweight", true, "accessory", [10, 15], C],
  ["leg-curl", "Leg curl", ["legCurl"], ["hamstrings"], [], "knee-flexion", "machine", true, "accessory", [10, 15], I],
  ["nordic", "Nordic curl (feet anchored)", ["floor"], ["hamstrings"], [], "knee-flexion", "bodyweight", true, "accessory", [3, 8], I],
  ["slider-curl", "Sliding leg curl (towel on a smooth floor)", ["floor"], ["hamstrings"], ["glutes"], "knee-flexion", "bodyweight", true, "accessory", [8, 15], I],
  ["hip-thrust", "Barbell hip thrust", ["barbell", "bench"], ["glutes"], ["hamstrings"], "glute", "barbell", true, "accessory", [8, 12], C],
  ["db-hip-thrust", "Dumbbell hip thrust", ["dumbbells", "bench"], ["glutes"], ["hamstrings"], "glute", "dumbbell", true, "accessory", [10, 15], C],
  ["glute-bridge", "Single-leg glute bridge", ["floor"], ["glutes"], ["hamstrings"], "glute", "bodyweight", true, "accessory", [10, 20], I],
  ["standing-calf", "Standing calf raise (smith or machine)", ["smith"], ["calves"], [], "calf", "machine", true, "accessory", [10, 15], I],
  ["db-calf", "Single-leg dumbbell calf raise", ["dumbbells"], ["calves"], [], "calf", "dumbbell", true, "accessory", [10, 15], I],
  ["bw-calf", "Single-leg calf raise", ["floor"], ["calves"], [], "calf", "bodyweight", true, "accessory", [12, 25], I],
  ["leg-press-calf", "Leg-press calf raise", ["legPress"], ["calves"], [], "calf", "machine", true, "accessory", [10, 15], I],
  // core
  ["hanging-knee-raise", "Hanging knee raise", ["pullupBar"], ["abs"], [], "core-flexion", "bodyweight", false, "accessory", [8, 15], I],
  ["cable-crunch", "Cable crunch", ["cable"], ["abs"], [], "core-flexion", "cable", false, "accessory", [10, 15], I],
  ["crunch", "Crunch", ["floor"], ["abs"], [], "core-flexion", "bodyweight", false, "accessory", [12, 25], I],
  ["plank", "Plank (seconds as reps, ÷5)", ["floor"], ["abs"], [], "core-stability", "bodyweight", false, "accessory", [6, 12], I],
];

export const EXERCISES = rows.map(([id, name, equipment, primary, secondary, pattern, load, lower, tier, reps, kind]) =>
  ({ id, name, equipment, primary, secondary, pattern, load, lower, tier, reps, kind }));
export const BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/** Sets credited to each muscle by one set of this exercise (primary 1, secondary 0.5). */
export function credit(ex) {
  const c = {};
  for (const m of ex.secondary) c[m] = 0.5;
  for (const m of ex.primary) c[m] = 1;
  return c;
}

export const available = (ex, equipment) => ex.equipment.every((e) => e === "floor" || equipment.includes(e));
