import http from "node:http";
import { AUTHORSHIP, confessions, loadAll, overview, replay, reset, runCycle } from "./store.mjs";

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.CONTROL_TOKEN || "";

function send(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function authorized(req, body) {
  if (!TOKEN) return req.headers.origin ? String(req.headers.origin).includes("localhost") || !req.headers.origin : true;
  const header = String(req.headers["x-control-token"] || "");
  return header === TOKEN || body.token === TOKEN;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": req.headers.origin || "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-control-token",
    });
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/api/simulation/health") {
      const { state, events } = await loadAll();
      return send(res, 200, {
        ok: true,
        schemaVersion: state.schemaVersion,
        eventCount: events.length,
        stateHash: state.stateHash,
        lastCycle: state.cycle,
        authorship: AUTHORSHIP,
      });
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/overview") {
      const { state, events } = await loadAll();
      return send(res, 200, overview(state, events));
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/twins") {
      const { state, events } = await loadAll();
      return send(res, 200, overview(state, events).twins);
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/events") {
      const { events } = await loadAll();
      return send(res, 200, events.slice(-50).reverse());
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/cycles") {
      const { cycles } = await loadAll();
      return send(res, 200, cycles);
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/confessions") {
      const { events } = await loadAll();
      return send(res, 200, confessions(events));
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/regret") {
      const { cycles } = await loadAll();
      const window = cycles.slice(-10);
      const avg = window.length ? window.reduce((s, c) => s + c.regret, 0) / window.length : 0;
      return send(res, 200, { series: cycles, movingAverage10: avg });
    }
    if (req.method === "GET" && url.pathname === "/api/simulation/replay-check") {
      const before = await loadAll();
      const hashA = before.state.stateHash;
      const cyclesA = before.state.cycle;
      await reset(before.state.seed);
      for (let i = 0; i < cyclesA; i += 1) await runCycle();
      const after = await loadAll();
      return send(res, 200, {
        match: after.state.stateHash === hashA,
        liveHash: hashA,
        replayHash: after.state.stateHash,
        eventsReplayed: after.events.length,
      });
    }
    if (req.method === "POST" && url.pathname === "/api/simulation/control") {
      const body = await readBody(req);
      if (!authorized(req, body)) return send(res, 401, { error: "unauthorized" });
      if (body.action === "reset") {
        await reset(body.seed || 20260926);
      } else if (body.action === "run") {
        await runCycle();
      } else if (body.action === "pause") {
        const all = await loadAll();
        all.state.status = "paused";
      }
      const { state, events } = await loadAll();
      return send(res, 200, overview(state, events));
    }
    send(res, 404, { error: "not_found" });
  } catch (error) {
    send(res, 500, { error: String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`Socialia engine 0.9 on :${PORT}`);
  console.log(`${AUTHORSHIP.builder} × ${AUTHORSHIP.specification}`);
});
