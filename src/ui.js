// ui system — v12, integrated from the deployed v11.

function updateObjective() {
  const pct =
    phase === "day"
      ? Math.max(0, Math.min(100, (phaseT / (day === 1 ? 24 : 20)) * 100))
      : Math.max(
          0,
          Math.min(
            100,
            ((waveLeft + enemies.length) / nightEnemyCount(day)) * 100,
          ),
        );
  $("phaseFill").style.width = pct + "%";
  $("phaseCaption").textContent =
    phase === "day"
      ? "夜まで " + Math.max(0, Math.ceil(phaseT)) + "秒"
      : "残り " + (waveLeft + enemies.length) + "体";
}

const resourceHudValues = new Map();
function updateHUD() {
  for (const [id, value] of [
    ["wood", wood],
    ["coal", coal],
    ["iron", iron],
  ]) {
    const old = resourceHudValues.get(id),
      chip = $(id).parentElement?.parentElement;
    if (old !== undefined && old !== value && chip) {
      chip.classList.remove("gained", "spent");
      // One local layout only on a resource transaction, never per animation frame.
      void chip.offsetWidth;
      chip.classList.add(value > old ? "gained" : "spent");
    }
    resourceHudValues.set(id, value);
  }
  $("fuelMeter").style.width = Math.max(0, Math.min(100, fuel)) + "%";
  $("baseMeter").style.width =
    Math.max(0, Math.min(100, (baseHP / baseMax) * 100)) + "%";
  for (const [id, low] of [
    ["fuelChip", fuel < 25],
    ["baseChip", baseHP / baseMax < 0.3],
  ]) {
    if (low) $(id).classList.add("warning");
    else $(id).classList.remove("warning");
  }
  $("wood").textContent = wood | 0;
  $("coal").textContent = coal | 0;
  $("iron").textContent = iron | 0;
  $("day").textContent = day;
  $("stageNumber").textContent = currentStage;
  $("phase").textContent = phase === "day" ? "🌞" : "⚔️";
  $("temp").textContent = temp;
  $("fire").textContent = Math.max(0, fuel | 0);
  $("base").textContent = Math.max(0, ((baseHP / baseMax) * 100) | 0);
  $("baseLv").textContent = baseLevel;
  $("baseBadge").innerHTML = "🏰 拠点 <span>Lv." + baseLevel + "</span>";
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.style.opacity = 1;
  clearTimeout(t._tm);
  t._tm = setTimeout(() => (t.style.opacity = 0), 1800);
}

function flash() {
  const f = $("flash");
  f.style.opacity = 1;
  setTimeout(() => (f.style.opacity = 0), 180);
}
