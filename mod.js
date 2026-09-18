
"use strict";

const buttons = [
  ["noGravity", "No Gravity"],
  ["superJump", "Super Jump"],
  ["moonGravity", "Moon Gravity"],
  ["heavyGravity", "Heavy Gravity"],
  ["speed", "Speed x3"],
  ["slow", "Slow Motion"],
  ["hugeGaps", "Huge Gaps"],
  ["tinyGaps", "Tiny Gaps"],
  ["invincible", "Invincible"],
  ["autoFlap", "Auto Flap"],
  ["showFps", "Show FPS"]
];

const enabled = Object.create(null);
let menu = null;
let autoFlapTimer = null;
let fpsFrames = 0;
let fpsValue = 0;
let fpsStamp = performance.now();

const basePhysics = {
  "Super Easy": { gravity: 0.10, jump: -2.5, pipeGap: 280, pipeSpeed: 0.8 },
  "Easy":       { gravity: 0.18, jump: -3.5, pipeGap: 220, pipeSpeed: 1.5 },
  "Medium":     { gravity: 0.25, jump: -4.5, pipeGap: 160, pipeSpeed: 2.5 },
  "Hard":       { gravity: 0.30, jump: -5.0, pipeGap: 140, pipeSpeed: 3.0 },
  "Impossible": { gravity: 0.35, jump: -5.0, pipeGap: 120, pipeSpeed: 4.0 }
};

function makeMenu() {
  if (menu) return;

  menu = document.createElement("div");
  menu.id = "butter-menu";
  menu.style.cssText = [
    "position:absolute",
    "left:50%",
    "top:50%",
    "transform:translate(-50%,-50%)",
    "width:330px",
    "max-height:540px",
    "overflow:auto",
    "box-sizing:border-box",
    "padding:12px",
    "background:#101010",
    "border:3px solid #f4c542",
    "box-shadow:0 0 0 2px #000,0 8px 30px rgba(0,0,0,.65)",
    "font-family:monospace",
    "color:#fff",
    "z-index:99999",
    "display:none",
    "user-select:none"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "★ BUTTER MENU ★";
  title.style.cssText =
    "text-align:center;font-weight:bold;font-size:18px;color:#f4c542;margin-bottom:4px";
  menu.appendChild(title);

  const help = document.createElement("div");
  help.textContent = "Press M to open/close • client-side only";
  help.style.cssText =
    "text-align:center;color:#aaa;font-size:10px;margin-bottom:10px";
  menu.appendChild(help);

  const list = document.createElement("div");
  menu.appendChild(list);

  buttons.forEach(([id, label]) => {
    const row = document.createElement("button");
    row.type = "button";
    row.dataset.id = id;
    row.style.cssText = [
      "display:flex",
      "width:100%",
      "box-sizing:border-box",
      "justify-content:space-between",
      "align-items:center",
      "margin:4px 0",
      "padding:8px 10px",
      "border:1px solid #555",
      "background:#202020",
      "color:#fff",
      "font-family:monospace",
      "font-size:12px",
      "cursor:pointer"
    ].join(";");

    const name = document.createElement("span");
    name.textContent = label;

    const state = document.createElement("span");
    state.className = "butter-state";
    state.style.fontWeight = "bold";

    row.append(name, state);
    row.addEventListener("click", () => toggle(id));
    list.appendChild(row);
  });

  const actions = document.createElement("div");
  actions.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px";

  function action(text, fn) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.style.cssText =
      "padding:8px;border:1px solid #555;background:#333;color:#fff;font-family:monospace;font-weight:bold;cursor:pointer";
    b.addEventListener("click", fn);
    actions.appendChild(b);
  }

  action("Give 100 Coins", () => api.addCoins(100));
  action("Unlock All Skins", () => api.unlockAllSkins());
  action("Start Game", () => api.start());
  action("Reset Cheats", resetCheats);

  menu.appendChild(actions);

  const status = document.createElement("div");
  status.id = "butter-status";
  status.style.cssText =
    "text-align:center;color:#aaa;font-size:10px;margin-top:8px;min-height:14px";
  menu.appendChild(status);

  const wrapper = document.getElementById("game-wrapper");
  if (wrapper) wrapper.appendChild(menu);
  else document.body.appendChild(menu);

  refreshMenu();
}

function setStatus(message) {
  const el = document.getElementById("butter-status");
  if (el) el.textContent = message;
}

function refreshMenu() {
  if (!menu) return;
  menu.querySelectorAll("button[data-id]").forEach(row => {
    const id = row.dataset.id;
    const on = !!enabled[id];
    row.style.background = on ? "#5a4610" : "#202020";
    row.style.borderColor = on ? "#f4c542" : "#555";
    const state = row.querySelector(".butter-state");
    state.textContent = on ? "ON" : "OFF";
    state.style.color = on ? "#f4c542" : "#888";
  });
}

function getBase() {
  const s = api.getState();
  return basePhysics[s.difficulty] || basePhysics.Easy;
}

function applyPhysics() {
  const b = getBase();
  let gravity = b.gravity;
  let jump = b.jump;
  let pipeGap = b.pipeGap;
  let pipeSpeed = b.pipeSpeed;

  if (enabled.noGravity) gravity = 0;
  else if (enabled.moonGravity) gravity = 0.05;
  else if (enabled.heavyGravity) gravity = 0.60;

  if (enabled.superJump) jump = -10;

  if (enabled.speed) pipeSpeed *= 3;
  if (enabled.slow) pipeSpeed *= 0.30;

  if (enabled.hugeGaps) pipeGap = 400;
  else if (enabled.tinyGaps) pipeGap = 60;

  api.setPhysics({ gravity, jump, pipeGap, pipeSpeed });
}

function startAutoFlap() {
  stopAutoFlap();
  if (!enabled.autoFlap) return;

  autoFlapTimer = api.setInterval(() => {
    if (!enabled.autoFlap) return;
    if (api.getState().state !== "game") return;
    document.dispatchEvent(new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true
    }));
  }, 220);
}

function stopAutoFlap() {
  if (autoFlapTimer !== null) {
    clearInterval(autoFlapTimer);
    autoFlapTimer = null;
  }
}

function toggle(id) {
  enabled[id] = !enabled[id];

  if (id === "invincible") api.setInvincible(enabled[id]);

  if (id === "autoFlap") {
    if (enabled.autoFlap) startAutoFlap();
    else stopAutoFlap();
  }

  if ([
    "noGravity", "superJump", "moonGravity", "heavyGravity",
    "speed", "slow", "hugeGaps", "tinyGaps"
  ].includes(id)) {
    applyPhysics();
  }

  refreshMenu();
  setStatus((enabled[id] ? "Enabled: " : "Disabled: ") +
            buttons.find(x => x[0] === id)[1]);
}

function resetCheats() {
  Object.keys(enabled).forEach(k => enabled[k] = false);
  stopAutoFlap();
  api.setInvincible(false);
  api.clearPhysics();
  refreshMenu();
  setStatus("All Butter Menu cheats reset.");
}

function keyHandler(e) {
  if (e.repeat) return;

  if (e.key.toLowerCase() === "m") {
    makeMenu();
    menu.style.display = menu.style.display === "none" ? "block" : "none";
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (e.key === "Escape" && menu && menu.style.display !== "none") {
    menu.style.display = "none";
    e.preventDefault();
    e.stopPropagation();
  }
}

function frameHandler() {
  if (enabled.showFps) {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsStamp >= 500) {
      fpsValue = Math.round((fpsFrames * 1000) / (now - fpsStamp));
      fpsFrames = 0;
      fpsStamp = now;
    }
  } else {
    fpsFrames = 0;
    fpsStamp = performance.now();
  }
}

function drawHandler({ ctx, canvas }) {
  if (enabled.showFps) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.70)";
    ctx.fillRect(6, canvas.height - 25, 92, 18);
    ctx.fillStyle = "#f4c542";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("BUTTER FPS: " + fpsValue, 10, canvas.height - 12);
    ctx.restore();
  }
}


api.on("frame", frameHandler);
api.on("draw", drawHandler);

document.addEventListener("keydown", keyHandler, true);

makeMenu();

return function teardown() {
  stopAutoFlap();
  document.removeEventListener("keydown", keyHandler, true);
  if (menu) menu.remove();
  menu = null;
};
