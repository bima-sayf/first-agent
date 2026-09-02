const socket = io();

let TILE = 72;
let sprites = {}; // id -> {container, circle, label}
let locations = [];
let scene = null;

class VillageScene extends Phaser.Scene {
  constructor() {
    super("village");
  }

  preload() {}

  create() {
    scene = this;
    this.locLayer = this.add.container(0, 0);
    this.agentLayer = this.add.container(0, 0);
  }

  drawLocations() {
    this.locLayer.removeAll(true);
    const colors = { work: 0x33691e, social: 0x6a1b9a, home: 0x37474f };
    locations.forEach((loc) => {
      const px = loc.x * TILE + TILE / 2;
      const py = loc.y * TILE + TILE / 2;
      const rect = this.add.rectangle(px, py, TILE - 8, TILE - 8, colors[loc.type] || 0x333, 0.55);
      rect.setStrokeStyle(2, 0x000000, 0.4);
      const label = this.add
        .text(px, py, loc.name, { fontSize: "10px", color: "#ffffff", align: "center", wordWrap: { width: TILE - 10 } })
        .setOrigin(0.5);
      this.locLayer.add([rect, label]);
    });
  }

  upsertAgent(a) {
    const px = a.x * TILE + TILE / 2;
    const py = a.y * TILE + TILE / 2;

    if (!sprites[a.id]) {
      const circle = this.add.circle(0, 0, TILE * 0.28, a.color).setStrokeStyle(2, 0x000000, 0.6);
      const emoji = this.add.text(0, -2, a.emoji, { fontSize: "18px" }).setOrigin(0.5);
      const name = this.add
        .text(0, TILE * 0.32, a.name, { fontSize: "11px", color: "#ffffff", fontStyle: "bold" })
        .setOrigin(0.5);
      const container = this.add.container(px, py, [circle, emoji, name]);
      this.agentLayer.add(container);
      sprites[a.id] = { container };
    }

    const { container } = sprites[a.id];
    this.tweens.add({ targets: container, x: px, y: py, duration: 700, ease: "Sine.easeInOut" });
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#3e5c3a",
  width: 8 * TILE,
  height: 9 * TILE,
  scene: VillageScene
};

new Phaser.Game(config);

// ---- Socket wiring ----

function renderClock(time) {
  document.getElementById("clock").textContent = time;
}

function renderEngineBadge(engine) {
  const el = document.getElementById("engine-badge");
  if (engine.useLLM) {
    el.textContent = `LLM mode (${engine.model})`;
    el.className = "badge llm";
  } else {
    el.textContent = "Rule-based fallback mode";
    el.className = "badge fallback";
  }
}

function renderVillagerList(agents) {
  const el = document.getElementById("villager-list");
  el.innerHTML = agents
    .map(
      (a) => `
      <div class="villager-row">
        <div class="emoji">${a.emoji}</div>
        <div>
          <div class="name">${a.name} <span class="status">· ${a.status} @ ${a.currentLocation}</span></div>
          <div class="thought">${a.lastThought || ""}</div>
        </div>
      </div>`
    )
    .join("");
}

function appendLog(entry) {
  const el = document.getElementById("log");
  const div = document.createElement("div");
  div.className = "log-entry";
  div.innerHTML = `<span class="t">${entry.time}</span>${entry.text}`;
  el.prepend(div);
  while (el.children.length > 40) el.removeChild(el.lastChild);
}

socket.on("init", (data) => {
  TILE = data.grid.tileSize;
  locations = data.locations;
  renderClock(data.time);
  renderEngineBadge(data.engine);
  renderVillagerList(data.agents);
  data.history.forEach(appendLog);

  const start = () => {
    scene.drawLocations();
    data.agents.forEach((a) => scene.upsertAgent(a));
  };
  if (scene) start();
  else setTimeout(start, 300); // wait for Phaser scene to boot
});

socket.on("state", (data) => {
  renderClock(data.time);
  renderVillagerList(data.agents);
  if (scene) data.agents.forEach((a) => scene.upsertAgent(a));
});

socket.on("history", appendLog);
