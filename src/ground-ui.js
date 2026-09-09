// Opaque world rings + small projected DOM labels; no transparent CanvasTexture.
function makeGroundTag(title, sub = "", accent = "#ffd36b") {
  const g = new THREE.Group(),
    ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.06, 32),
      new THREE.MeshBasicMaterial({
        color: accent,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  g.add(ring);
  const el = document.createElement("div");
  el.className = "groundHud";
  $("groundLabels").appendChild(el);
  g.userData = { el, ring, last: "", ready: false };
  scene.add(g);
  groundTagMeshes.push(g);
  setGroundTag(g, title, sub, accent);
  return g;
}
function setGroundTag(g, title, sub = "", accent = "#ffd36b") {
  if (!g) return;
  const sig = title + "|" + sub + "|" + accent;
  if (g.userData.last === sig) return;
  g.userData.last = sig;
  g.userData.el.innerHTML =
    title + (sub ? '<span class="cost">' + sub + "</span>" : "");
  g.userData.el.style.borderColor =
    typeof accent === "number"
      ? "#" + accent.toString(16).padStart(6, "0")
      : accent;
  g.userData.ring.material.color.set(accent);
}
function setTagState(tag, { ready = false, locked = false } = {}) {
  tag.userData.ready = ready;
  tag.userData.el.className =
    "groundHud" + (ready ? " ready" : "") + (locked ? " locked" : "");
}
function clearGroundTags() {
  for (const g of groundTagMeshes) {
    g.userData.el.remove();
    disposeObject(g);
  }
  groundTagMeshes = [];
}
function costText(c) {
  return [
    ["wood", "🌲", wood],
    ["coal", "🪨", coal],
    ["iron", "⚙️", iron],
  ]
    .filter(([key]) => c[key] > 0)
    .map(
      ([key, icon, have]) =>
        `<span class="${have < c[key] ? "missing" : ""}">${icon}${c[key]}</span>`,
    )
    .join(" ");
}
function canAfford(c) {
  return (
    wood >= (c.wood || 0) && coal >= (c.coal || 0) && iron >= (c.iron || 0)
  );
}
function ensureBaseGroundTag() {
  if (!baseGroundTag) {
    baseGroundTag = makeGroundTag("🏰 Lv.1", "");
    baseGroundTag.position.set(0, 0.56, 2.25);
  }
  const c = baseUpgradeCost(),
    ready = phase === "day" && baseLevel < 5 && canAfford(c);
  setGroundTag(
    baseGroundTag,
    "🏰 Lv." + baseLevel + (baseLevel < 5 ? " → " + (baseLevel + 1) : " MAX"),
    baseLevel < 5 ? costText(c) : "",
    ready ? "#86f0b1" : "#ffd36b",
  );
  setTagState(baseGroundTag, { ready });
}
function updatePadTag(p) {
  if (p.built) return;
  const c = getBuildCost(p),
    locked = baseLevel < requiredBaseLevel(p.type),
    ready = !locked && !p.constructing && canAfford(c);
  const title =
    typeIcon(p.type) +
    (p.constructing
      ? " 建築中"
      : p.rebuilding
        ? " 再建"
        : " " + typeName(p.type));
  setGroundTag(
    p.tag,
    title,
    p.constructing
      ? ""
      : locked
        ? "🔒 Lv." + requiredBaseLevel(p.type)
        : costText(c),
    ready ? "#86f0b1" : locked ? "#8ea6bd" : "#ffd36b",
  );
  setTagState(p.tag, { ready, locked });
}
function updateWorldLabels() {
  ensureBaseGroundTag();
  for (const p of buildPads) updatePadTag(p);
  for (const st of defenseState.values()) {
    const max = st.level >= MAX_DEF_LV,
      c = getUpgradeCost(st),
      ready = phase === "day" && !max && canAfford(c);
    setGroundTag(
      st.tag,
      typeIcon(st.type) +
        " Lv." +
        st.level +
        (max ? " MAX" : " → " + (st.level + 1)),
      max ? "" : costText(c),
      ready ? "#86f0b1" : "#ffd36b",
    );
    setTagState(st.tag, { ready });
  }
  for (const o of outposts) {
    refreshOutpostTag(o);
    setTagState(o.tag, {
      ready:
        phase === "day" && !o.captured && baseLevel >= outpostInfo(o.type).need,
      locked: !o.captured && baseLevel < outpostInfo(o.type).need,
    });
  }
}
const labelVector = new THREE.Vector3();
function projectGroundTags(t) {
  // Rings remain visible at distance; detailed labels only appear close to the player.
  const rect = renderer.domElement.getBoundingClientRect(),
    hudBottom = $("hud").getBoundingClientRect().bottom + 18,
    occupied = [];
  const tags = [...groundTagMeshes].sort(
    (a, b) =>
      a.position.distanceToSquared(pPos) - b.position.distanceToSquared(pPos),
  );
  for (const g of tags) {
    const { el, ring, ready } = g.userData;
    ring.scale.setScalar(ready ? 1 + Math.sin(t * 5) * 0.05 : 1);
    labelVector.copy(g.position).project(camera);
    const x = rect.left + (labelVector.x * 0.5 + 0.5) * rect.width,
      y = rect.top + (-labelVector.y * 0.5 + 0.5) * rect.height + 14;
    const width = el.offsetWidth || 105,
      height = el.offsetHeight || 36,
      box = {
        left: x - width / 2,
        right: x + width / 2,
        top: y - height / 2,
        bottom: y + height / 2,
      };
    const close =
      Math.hypot(g.position.x - pPos.x, g.position.z - pPos.z) < 7.5;
    const on =
      running &&
      close &&
      labelVector.z > -1 &&
      labelVector.z < 1 &&
      box.top > hudBottom &&
      box.left >= 6 &&
      box.right <= rect.right - 6 &&
      box.bottom < rect.bottom - 8 &&
      !occupied.some(
        (b) =>
          box.left < b.right + 4 &&
          box.right > b.left - 4 &&
          box.top < b.bottom + 4 &&
          box.bottom > b.top - 4,
      );
    el.style.visibility = on ? "visible" : "hidden";
    if (!on) continue;
    el.style.left = x + "px";
    el.style.top = y + "px";
    occupied.push(box);
  }
}
