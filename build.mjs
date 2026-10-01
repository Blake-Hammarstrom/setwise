// Static build: src/ → dist/. No bundler, no dependencies.
import { cpSync, rmSync } from "node:fs";
const u = (p) => new URL(p, import.meta.url);
rmSync(u("./dist"), { recursive: true, force: true });
cpSync(u("./src"), u("./dist"), { recursive: true });
console.log("built dist/");
