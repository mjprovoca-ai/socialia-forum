import { writeFile } from "node:fs/promises";
import { loadAll, reset, runCycle } from "./store.mjs";

await reset(20260926);
for (let i = 0; i < 20; i += 1) await runCycle();
const first = await loadAll();
const hashA = first.state.stateHash;
const eventsA = first.events.length;

await reset(20260926);
for (let i = 0; i < 20; i += 1) await runCycle();
const second = await loadAll();

const report = {
  match: second.state.stateHash === hashA,
  hashA,
  hashB: second.state.stateHash,
  eventsA,
  eventsB: second.events.length,
  cycles: 20,
  authorship: {
    builder: "Maria João Abujamra",
    specification: "Grok (xAI)",
  },
};

await writeFile(new URL("../data/last-validation.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.match) process.exit(1);
