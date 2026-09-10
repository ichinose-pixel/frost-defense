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
  g.userData.accent = accent;
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
  tag.userData.locked = locked;
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
    baseGroundTag.position.set(0, 0.56, 0);
    baseGroundTag.userData.radius = 2.8;
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
      ? "離れると完成"
      : locked
        ? "🔒 Lv." + requiredBaseLevel(p.type)
        : (p.progress > 0
            ? "建築 " +
              Math.min(100, Math.round((p.progress / 0.8) * 100)) +
              "% · "
            : "") + costText(c),
    ready ? "#86f0b1" : locked ? "#8ea6bd" : "#ffd36b",
  );
  p.tag.userData.pad = true;
  p.tag.userData.built = false;
  p.tag.userData.locked = locked;
  setTagState(p.tag, { ready, locked });
}
function updateWorldLabels() {
  ensureBaseGroundTag();
  for (const p of buildPads) updatePadTag(p);
  for (const st of defenseState.values()) {
    st.tag.userData.built = true;
    st.tag.userData.locked = false;
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
function setTagFootprint(tag, type, x, z) {
  const f = defenseFootprint(type, x, z),
    w = f.width / 2,
    d = f.depth / 2,
    inset = 0.055;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -d);
  shape.lineTo(w, -d);
  shape.lineTo(w, d);
  shape.lineTo(-w, d);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-w + inset, -d + inset);
  hole.lineTo(-w + inset, d - inset);
  hole.lineTo(w - inset, d - inset);
  hole.lineTo(w - inset, -d + inset);
  hole.closePath();
  shape.holes.push(hole);
  tag.userData.ring.geometry.dispose();
  tag.userData.ring.geometry = new THREE.ShapeGeometry(shape);
  tag.userData.type = type;
}
function groundTagDistance(tag) {
  if (tag.userData.type)
    return distanceToDefense(tag.userData.type, tag.position.x, tag.position.z);
  return Math.max(
    0,
    Math.hypot(tag.position.x - pPos.x, tag.position.z - pPos.z) -
      (tag.userData.radius || 1.8),
  );
}
function focusedGroundTag() {
  const pad = nearestBuildPad();
  if (pad) return pad.tag;
  let chosen = null,
    nearest = 0.7;
  for (const tag of groundTagMeshes) {
    if (tag.userData.locked) continue;
    const d = groundTagDistance(tag);
    if (d < nearest) {
      chosen = tag;
      nearest = d;
    }
  }
  return chosen;
}
const labelVector = new THREE.Vector3();
function projectGroundTags(t) {
  const rect = renderer.domElement.getBoundingClientRect(),
    hudBottom = $("hud").getBoundingClientRect().bottom + 18;
  const focused = running ? focusedGroundTag() : null;
  for (const g of groundTagMeshes) {
    const { el, ring, ready, pad, built, locked } = g.userData,
      selected = g === focused;
    // The outline is also the footprint: never rotate/scale it independently of the building.
    ring.visible = running && ((pad && !built && !locked) || selected);
    ring.material.color.set(
      selected
        ? ready
          ? "#86f0b1"
          : g.userData.accent || "#ffd36b"
        : "#50677a",
    );
    el.style.visibility = "hidden";
    if (!selected) continue;
    labelVector.copy(g.position).project(camera);
    const x = rect.left + (labelVector.x * 0.5 + 0.5) * rect.width,
      y = rect.top + (-labelVector.y * 0.5 + 0.5) * rect.height;
    const w = el.offsetWidth || 105,
      h = el.offsetHeight || 36;
    if (
      labelVector.z <= -1 ||
      labelVector.z >= 1 ||
      y - h / 2 <= hudBottom ||
      x - w / 2 < 6 ||
      x + w / 2 > rect.right - 6 ||
      y + h / 2 >= rect.bottom - 8
    )
      continue;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.visibility = "visible";
  }
}
