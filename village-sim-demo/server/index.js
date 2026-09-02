const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { VILLAGERS } = require("./villagers");
const { Agent } = require("./agent");
const { LOCATIONS, GRID_W, GRID_H, TILE_SIZE, locationByName } = require("./world");
const { decide, USE_LLM, OLLAMA_URL, OLLAMA_MODEL } = require("./decisionEngine");

const PORT = process.env.PORT || 3000;
const TICK_MS = Number(process.env.TICK_MS || 3000);

const app = express();
app.use(express.static(path.join(__dirname, "..", "public")));

const server = http.createServer(app);
const io = new Server(server);

const agents = VILLAGERS.map((def) => new Agent(def));

let simMinutes = 8 * 60; // start at 08:00
const history = []; // {time, text}

function timeOfDayLabel() {
  const h = Math.floor(simMinutes / 60) % 24;
  const m = simMinutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  let part = "night";
  if (h >= 5 && h < 11) part = "morning";
  else if (h >= 11 && h < 17) part = "afternoon";
  else if (h >= 17 && h < 21) part = "evening";
  return `${hh}:${mm} (${part})`;
}

function nearbyAgentNames(agent) {
  return agents
    .filter((o) => o.id !== agent.id && agent.distanceTo(o) < 1.5)
    .map((o) => o.name);
}

function pushHistory(text) {
  history.push({ time: timeOfDayLabel(), text });
  if (history.length > 100) history.shift();
  io.emit("history", history[history.length - 1]);
}

async function tickOnce() {
  simMinutes = (simMinutes + 20) % (24 * 60);

  // 1. Advance movement / in-progress actions.
  agents.forEach((a) => a.tick(agents));

  // 2. For any agent that's now free, ask the decision engine for a plan.
  const freeAgents = agents.filter((a) => a.isFree());
  await Promise.all(
    freeAgents.map(async (agent) => {
      const worldSummary = {
        currentLocation: agent.currentLocation,
        timeOfDay: timeOfDayLabel(),
        nearbyAgents: nearbyAgentNames(agent)
      };
      const decision = await decide(agent, worldSummary);
      agent.applyDecision(decision, agents);
      if (decision.thought) pushHistory(decision.thought);
    })
  );

  io.emit("state", {
    time: timeOfDayLabel(),
    agents: agents.map((a) => a.summaryForClient())
  });
}

io.on("connection", (socket) => {
  socket.emit("init", {
    grid: { w: GRID_W, h: GRID_H, tileSize: TILE_SIZE },
    locations: LOCATIONS,
    agents: agents.map((a) => a.summaryForClient()),
    history: history.slice(-30),
    time: timeOfDayLabel(),
    engine: { useLLM: USE_LLM, url: OLLAMA_URL, model: OLLAMA_MODEL }
  });
});

setInterval(() => {
  tickOnce().catch((err) => console.error("[tick error]", err));
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Village sim demo running on http://localhost:${PORT}`);
  console.log(
    USE_LLM
      ? `LLM mode ON — expecting Ollama at ${OLLAMA_URL} (model: ${OLLAMA_MODEL}). Falls back to rule-based behavior if unreachable.`
      : "LLM mode OFF (USE_LLM=false) — running in rule-based fallback mode only."
  );
});
