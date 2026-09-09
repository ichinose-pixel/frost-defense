// ui system — v12, integrated from the deployed v11.

function updateObjective() {
  const pct =
    phase === "day"
      ? Math.max(0, Math.min(100, (phaseT / (day === 1 ? 24 : 20)) * 100))
      : Math.max(0, Math.min(100, fuel));
  $("phaseFill").style.width = pct + "%";
}

function updateHUD() {
  $("wood").textContent = wood | 0;
  $("coal").textContent = coal | 0;
  $("iron").textContent = iron | 0;
  $("day").textContent = day;
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
