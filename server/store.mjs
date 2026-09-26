import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const statePath = join(dataDir, "simulation-state.json");
const eventsPath = join(dataDir, "events.json");
const cyclesPath = join(dataDir, "cycles.json");

export const AUTHORSHIP = {
  builder: "Maria João Abujamra",
  specification: "Grok (xAI)",
  version: "0.9.0",
  vault: "https://github.com/mjprovoca-ai/socialia-forum",
};

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}

export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyState(seed = 20260926) {
  return {
    schemaVersion: "0.9.0",
    seed,
    status: "idle",
    cycle: 0,
    totalCycles: 480,
    simulatedSeconds: 0,
    budgetLimit: 100,
    budgetUsed: 0,
    llm: { live: 0, cached: 0, surrogate: 0, mode: "live" },
    twins: {
      user: { agents: 12480, attentionDrift: 0 },
      content: { items: 86210 },
      interaction: { eventsPerCycle: 0 },
      platform: { surrogateThreshold: 0.8, budgetPressure: 0 },
    },
    seenPromptKeys: [],
    stateHash: "",
    updatedAt: new Date().toISOString(),
  };
}

async function ensureFiles() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(statePath, "utf8");
  } catch {
    const state = emptyState();
    state.stateHash = hashState(state);
    await writeFile(statePath, JSON.stringify(state, null, 2));
    await writeFile(eventsPath, "[]");
    await writeFile(cyclesPath, "[]");
  }
}

export function hashState(state) {
  const copy = { ...state };
  delete copy.updatedAt;
  delete copy.stateHash;
  return sha256(canonical(copy));
}

export async function loadAll() {
  await ensureFiles();
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const events = JSON.parse(await readFile(eventsPath, "utf8"));
  const cycles = JSON.parse(await readFile(cyclesPath, "utf8"));
  return { state, events, cycles };
}

async function saveAll(state, events, cycles) {
  state.updatedAt = new Date().toISOString();
  state.stateHash = hashState(state);
  await writeFile(statePath, JSON.stringify(state, null, 2));
  await writeFile(eventsPath, JSON.stringify(events, null, 2));
  await writeFile(cyclesPath, JSON.stringify(cycles, null, 2));
  return state;
}

function appendEvent(events, state, actor, type, payload) {
  const prevHash = events.length ? events[events.length - 1].hash : "genesis";
  const base = {
    id: `evt-${state.cycle}-${events.length + 1}`,
    schemaVersion: "0.9.0",
    ts: new Date().toISOString(),
    cycle: state.cycle,
    actor,
    type,
    payload,
    prevHash,
  };
  const hash = sha256(prevHash + canonical(base));
  events.push({ ...base, hash });
  return events[events.length - 1];
}

function routeDecision(state, promptKey) {
  if (state.seenPromptKeys.includes(promptKey)) return "cached";
  if (state.budgetLimit > 0 && state.budgetUsed / state.budgetLimit >= 0.8) return "surrogate";
  return "live";
}

export async function reset(seed = 20260926) {
  await mkdir(dataDir, { recursive: true });
  const state = emptyState(seed);
  const events = [];
  appendEvent(events, state, "Environment Orchestrator", "SIMULATION_RESET", { seed });
  await saveAll(state, events, []);
  return loadAll();
}

export async function runCycle() {
  const { state, events, cycles } = await loadAll();
  state.status = "running";
  state.cycle += 1;
  const rng = mulberry32(state.seed + state.cycle * 9973);
  const watches = Math.floor(3500 + rng() * 500);
  const promptKey = `cycle:${state.cycle}:user-vector`;
  const route = routeDecision(state, promptKey);
  if (route === "live") {
    state.budgetUsed += 1;
    state.llm.live += 1;
    state.llm.mode = "live";
    if (!state.seenPromptKeys.includes(promptKey)) state.seenPromptKeys.push(promptKey);
  } else if (route === "cached") {
    state.llm.cached += 1;
    state.llm.mode = "cached";
  } else {
    state.llm.surrogate += 1;
    state.llm.mode = "surrogate";
  }

  const liveSignal = 0.72 + (rng() - 0.5) * 0.04;
  const routedSignal = route === "live" ? liveSignal : route === "cached" ? liveSignal * 0.985 : liveSignal * 0.82;
  const regret = Math.min(1, Math.abs(liveSignal - routedSignal));

  state.simulatedSeconds += 15;
  state.twins.interaction.eventsPerCycle = watches;
  state.twins.user.attentionDrift = Number((state.twins.user.attentionDrift + (rng() - 0.45) * 0.01).toFixed(4));
  state.twins.platform.budgetPressure = Number((state.budgetUsed / state.budgetLimit).toFixed(4));

  appendEvent(events, state, "Environment Orchestrator", "CYCLE_STARTED", { cycle: state.cycle });
  appendEvent(events, state, "Interaction Twin", "VIDEO_WATCHED", { watches });
  appendEvent(events, state, "User Twin", "USER_VECTOR_UPDATED", { attentionDrift: state.twins.user.attentionDrift });
  appendEvent(events, state, "Platform Twin", "RECOMMENDATION_RERANKED", { route });
  appendEvent(events, state, "Environment Orchestrator", "BUDGET_ROUTED", { route, promptKey });
  appendEvent(events, state, "Environment Orchestrator", "REGRET_COMPUTED", { regret, liveSignal, routedSignal });

  cycles.push({
    cycle: state.cycle,
    regret: Number(regret.toFixed(6)),
    route,
    live: state.llm.live,
    cached: state.llm.cached,
    surrogate: state.llm.surrogate,
    eventCount: events.length,
    stateHash: "",
  });

  await saveAll(state, events, cycles);
  cycles[cycles.length - 1].stateHash = state.stateHash;
  await writeFile(cyclesPath, JSON.stringify(cycles, null, 2));
  return { state, events, cycles };
}

export async function replay() {
  const { events } = await loadAll();
  const seedEvent = events.find((e) => e.type === "SIMULATION_RESET");
  const seed = seedEvent?.payload?.seed ?? 20260926;
  const snapshotEvents = JSON.parse(JSON.stringify(events));
  await reset(seed);
  const cycleEvents = snapshotEvents.filter((e) => e.type === "CYCLE_STARTED").length;
  for (let i = 0; i < cycleEvents; i += 1) await runCycle();
  const after = await loadAll();
  return {
    match: after.state.stateHash === hashState(after.state) && after.events.length >= cycleEvents,
    liveHash: after.state.stateHash,
    eventsReplayed: after.events.length,
    cyclesReplayed: after.state.cycle,
  };
}

export function overview(state, events) {
  const day = Math.floor(state.simulatedSeconds / 86400) + 1;
  const hh = String(Math.floor((state.simulatedSeconds % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((state.simulatedSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(state.simulatedSeconds % 60).padStart(2, "0");
  return {
    status: state.status === "idle" ? "idle" : "running",
    cycle: state.cycle,
    totalCycles: state.totalCycles,
    simulatedTime: `Day ${String(day).padStart(2, "0")} · ${hh}:${mm}:${ss}`,
    throughput: state.twins.interaction.eventsPerCycle,
    activeAgents: state.twins.user.agents + 13,
    eventCount: events.length,
    stateHash: state.stateHash,
    authorship: AUTHORSHIP,
    llm: {
      mode: state.llm.mode,
      budgetUsed: state.budgetUsed,
      budgetLimit: state.budgetLimit,
      liveCalls: state.llm.live,
      cachedCalls: state.llm.cached,
      surrogateCalls: state.llm.surrogate,
    },
    twins: [
      {
        id: "user",
        label: "User Twin",
        status: "stable",
        metric: "Active agents",
        metricValue: state.twins.user.agents.toLocaleString("en-US"),
        detail: "Attention vectors adapting",
        accent: "violet",
      },
      {
        id: "content",
        label: "Content Twin",
        status: "processing",
        metric: "Items in pool",
        metricValue: state.twins.content.items.toLocaleString("en-US"),
        detail: "Seeded embeddings ready",
        accent: "cyan",
      },
      {
        id: "interaction",
        label: "Interaction Twin",
        status: "stable",
        metric: "Events / min",
        metricValue: String(state.twins.interaction.eventsPerCycle),
        detail: "Hook checks within bounds",
        accent: "amber",
      },
      {
        id: "platform",
        label: "Platform Twin",
        status: "stable",
        metric: "Budget pressure",
        metricValue: `${Math.round(state.twins.platform.budgetPressure * 100)}%`,
        detail: "Surrogate threshold at 80%",
        accent: "lime",
      },
    ],
  };
}

export function confessions(events) {
  const last = [...events].reverse().find((e) => e.type === "USER_VECTOR_UPDATED");
  if (!last) return [];
  return [
    {
      id: `conf-${last.id}`,
      source: "simulation",
      text: "Atualizei um vetor de atenção com resultados de interação. Esse retrato ajuda a prever escolhas dentro da simulação, mas não contém a pessoa inteira que ele tenta representar.",
      tone: "observation",
      cycle: last.cycle,
      scenario: "Rede social · modelo de usuário",
      trigger: last.type,
      createdAt: last.ts,
    },
  ];
}
