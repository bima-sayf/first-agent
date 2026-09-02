const { LOCATIONS } = require("./world");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const USE_LLM = process.env.USE_LLM !== "false"; // set USE_LLM=false to force fallback mode
const LLM_TIMEOUT_MS = 6000;

const ACTIONS = ["move", "work", "talk", "rest"];

// ---- Fallback: cheap rule-based decision, used when no LLM is reachable ----
function fallbackDecision(agent, worldSummary) {
  const roll = Math.random();
  const workLocation = LOCATIONS.find((l) => l.type === "work") || LOCATIONS[0];
  const socialLocation = LOCATIONS.find((l) => l.type === "social") || LOCATIONS[0];

  if (roll < 0.45) {
    return {
      action: "move",
      target: workLocation.name,
      thought: `${agent.name} heads off to get some work done.`
    };
  }
  if (roll < 0.7) {
    return {
      action: "move",
      target: socialLocation.name,
      thought: `${agent.name} wanders toward the ${socialLocation.name.toLowerCase()} to see who's around.`
    };
  }
  if (roll < 0.85 && worldSummary.nearbyAgents.length > 0) {
    const other = worldSummary.nearbyAgents[0];
    return {
      action: "talk",
      target: other,
      thought: `${agent.name} strikes up a conversation with ${other}.`
    };
  }
  return {
    action: "rest",
    target: agent.home,
    thought: `${agent.name} decides to head home and rest a while.`
  };
}

function buildPrompt(agent, worldSummary) {
  const memoryLines = agent.memory.slice(-6).join("\n- ") || "Nothing notable yet.";
  const locationNames = LOCATIONS.map((l) => l.name).join(", ");
  return `You are simulating ONE character in a small village life-sim, deciding their next action.

Character: ${agent.name}, the village ${agent.role}.
Personality: ${agent.personality}
Current location: ${worldSummary.currentLocation}
Time of day: ${worldSummary.timeOfDay}
Nearby villagers: ${worldSummary.nearbyAgents.join(", ") || "none"}
Recent memories:
- ${memoryLines}

Valid locations: ${locationNames}
Valid actions: move, work, talk, rest

Reply with ONLY compact JSON, no markdown, no extra text, in this exact shape:
{"action": "move|work|talk|rest", "target": "<location name, or a nearby villager's name if action is talk>", "thought": "<one short first-person-ish sentence about what ${agent.name} is doing/thinking>"}`;
}

function parseModelJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no JSON object found in model output");
  const parsed = JSON.parse(match[0]);
  if (!ACTIONS.includes(parsed.action)) throw new Error("invalid action");
  if (!parsed.target || !parsed.thought) throw new Error("missing fields");
  return parsed;
}

async function llmDecision(agent, worldSummary) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(agent, worldSummary),
        stream: false,
        options: { temperature: 0.8 }
      }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`ollama http ${res.status}`);
    const data = await res.json();
    return parseModelJSON(data.response || "");
  } finally {
    clearTimeout(timeout);
  }
}

// Public entry point. Always resolves — never throws — falling back to
// rule-based behavior on any LLM failure so the sim never stalls.
async function decide(agent, worldSummary) {
  if (USE_LLM) {
    try {
      const result = await llmDecision(agent, worldSummary);
      return { ...result, source: "llm" };
    } catch (err) {
      console.warn(`[decisionEngine] LLM call failed for ${agent.name}, falling back: ${err.message}`);
    }
  }
  return { ...fallbackDecision(agent, worldSummary), source: "fallback" };
}

module.exports = { decide, USE_LLM, OLLAMA_URL, OLLAMA_MODEL };
