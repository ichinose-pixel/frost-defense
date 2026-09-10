// Construction owns the full lifecycle: available -> assembling -> waiting -> built.
const constructionSites = [];
let defenseActionConsumed = false;
function buildColor(type) {
  return type === "flame"
    ? 0xff8a55
    : type === "turret"
      ? 0x91d8ff
      : type === "warehouse"
        ? 0xd2aa72
        : 0xd59a5f;
}
function defenseFootprint(type, x, z) {
  if (type === "wall")
    return Math.abs(x) >= Math.abs(z)
      ? { width: 1, depth: 4 }
      : { width: 4, depth: 1 };
  return { width: 2, depth: 2 };
}
function distanceToDefense(type, x, z, px = pPos.x, pz = pPos.z) {
  const f = defenseFootprint(type, x, z);
  return Math.hypot(
    Math.max(0, Math.abs(px - x) - f.width / 2),
    Math.max(0, Math.abs(pz - z) - f.depth / 2),
  );
}
function defenseOverlapsPlayer(type, x, z, px = pPos.x, pz = pPos.z) {
  const f = defenseFootprint(type, x, z);
  return (
    Math.abs(px - x) < f.width / 2 + PLAYER_RADIUS &&
    Math.abs(pz - z) < f.depth / 2 + PLAYER_RADIUS
  );
}
function movementRequested() {
  return (
    Math.hypot(joyVec.x, joyVec.y) > 0.18 ||
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].some((k) => keys[k])
  );
}
function nearestBuildPad() {
  let best = null,
    distance = 0.7;
  for (const p of buildPads) {
    if (p.built || p.constructing || baseLevel < requiredBaseLevel(p.type))
      continue;
    const d = distanceToDefense(p.type, p.x, p.z);
    if (d < distance) {
      distance = d;
      best = p;
    }
  }
  return best;
}

function playerCollidesAt(x, z) {
  for (const [k, st] of defenseState) {
    const [ox, , oz] = k.split(",").map(Number);
    if (defenseOverlapsPlayer(st.type, ox, oz, x, z)) return true;
  }
  return false;
}
function restoreBuildPad(x, z) {
  const p = buildPads.find((p) => p.x === x && p.z === z);
  if (!p) return;
  p.built = false;
  p.constructing = false;
  p.rebuilding = true;
  p.progress = 0;
  p.g.visible = true;
  updatePadTag(p);
}
function buildFromPad(p) {
  if (p.built || p.constructing || baseLevel < requiredBaseLevel(p.type))
    return false;
  const c = getBuildCost(p);
  if (wood < c.wood || coal < c.coal) return false;
  defenseActionConsumed = true;
  wood -= c.wood;
  coal -= c.coal;
  showResourceDelivery(c, p.x, p.z);
  p.constructing = true;
  p.progress = 0;
  p.g.visible = false;
  const g = new THREE.Group();
  g.position.set(p.x, 0.5, p.z);
  scene.add(g);
  const dims =
    p.type === "wall"
      ? [
          [4, 0.12, 1],
          [0.22, 1.2, 0.22],
          [0.22, 1.2, 0.22],
          [3.8, 0.18, 0.3],
        ]
      : p.type === "turret"
        ? [
            [2, 0.12, 2],
            [0.24, 1.45, 0.24],
            [1.15, 0.18, 1.15],
            [0.7, 0.22, 0.24],
          ]
        : p.type === "flame"
          ? [
              [2, 0.12, 2],
              [0.95, 0.72, 0.95],
              [0.62, 0.38, 0.62],
              [0.22, 0.7, 0.22],
            ]
          : [
              [2, 0.12, 2],
              [1.5, 0.72, 1.18],
              [1.65, 0.18, 1.32],
              [0.52, 0.32, 0.12],
            ];
  const pieces = dims.map((d, i) => {
    const m = box(...d, buildColor(p.type));
    m.position.y = 0.12 + i * 0.4;
    if (p.type === "wall" && (i === 1 || i === 2)) {
      m.position.x = i === 1 ? -1.75 : 1.75;
      m.position.y = 0.72;
    }
    m.userData.y = m.position.y;
    m.scale.setScalar(0);
    g.add(m);
    return m;
  });
  if (p.type === "wall" && Math.abs(p.x) >= Math.abs(p.z))
    g.rotation.y = Math.PI / 2;
  constructionSites.push({ p, g, pieces, t: 0, duration: 0.78 });
  sfx("build");
  updateHUD();
  return true;
}
function completeSite(s) {
  const p = s.p;
  // Use the SAME footprint as movement, including long walls and wide warehouses.
  if (defenseOverlapsPlayer(p.type, p.x, p.z)) return false;
  disposeObject(s.g);
  const y = 1,
    hp = getDefenseMaxHp(p.type, 1);
  setBlock(p.x, y, p.z, p.type, hp);
  defenseState.set(key(p.x, y, p.z), {
    type: p.type,
    level: 1,
    hp,
    maxHp: hp,
    _progress: 0,
    tag: p.tag,
  });
  refreshDefenseVisual(p.x, y, p.z);
  if (p.type === "warehouse") {
    warehouseBonus += 40;
    wood += 12;
    coal += 6;
  }
  p.built = true;
  p.constructing = false;
  p.rebuilding = false;
  p.progress = 0;
  burst(p.x, 1, p.z, buildColor(p.type), 10);
  sfx("upgrade");
  worldPop(
    typeIcon(p.type) + " 完成",
    new THREE.Vector3(p.x, 1.8, p.z),
    "#ffe19a",
  );
  updateHUD();
  return true;
}
function updateBuildPads(dt) {
  if (movementRequested()) defenseActionConsumed = false;
  for (let i = constructionSites.length - 1; i >= 0; i--) {
    const s = constructionSites[i];
    s.t += dt;
    const q = Math.min(1, s.t / s.duration);
    s.pieces.forEach((m, j) => {
      const st = Math.max(0, Math.min(1, (q - j * 0.16) / 0.28)),
        e = 1 - Math.pow(1 - st, 3);
      m.scale.setScalar(e);
      m.position.y = m.userData.y + Math.sin(st * Math.PI) * 0.06;
    });
    if (q >= 1 && completeSite(s)) constructionSites.splice(i, 1);
  }
  const selected =
    movementRequested() || defenseActionConsumed ? null : nearestBuildPad();
  for (const p of buildPads) {
    if (p.built || p.constructing) continue;
    const c = getBuildCost(p);
    if (p === selected && canAfford(c)) {
      p.progress += dt;
      if (p.progress >= 0.8) {
        p.progress = 0;
        buildFromPad(p);
      }
    } else p.progress = 0;
  }
}
function resetConstruction() {
  defenseActionConsumed = false;
  for (const s of constructionSites) disposeObject(s.g);
  constructionSites.length = 0;
}
