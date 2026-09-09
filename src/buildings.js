// buildings system — v12, integrated from the deployed v11.

function typeName(t) {
  return t === "wall"
    ? "木柵"
    : t === "turret"
      ? "見張り台"
      : t === "flame"
        ? "火炎塔"
        : "倉庫";
}

function typeIcon(t) {
  return t === "wall"
    ? "🧱"
    : t === "turret"
      ? "🏹"
      : t === "flame"
        ? "🔥"
        : "📦";
}

function requiredBaseLevel(type) {
  return type === "wall" || type === "turret" ? 1 : type === "flame" ? 2 : 3;
}

function addBuildPads() {
  const defs = [];
  for (const x of [-6, -3, 0, 3, 6]) {
    defs.push([x, -6, "wall", 15]);
    defs.push([x, 6, "wall", 15]);
  }
  for (const z of [-3, 0, 3]) {
    defs.push([-6, z, "wall", 15]);
    defs.push([6, z, "wall", 15]);
  }
  defs.push(
    [-8, -8, "turret", 40],
    [8, -8, "turret", 40],
    [-8, 8, "turret", 40],
    [8, 8, "turret", 40],
  );
  defs.push([0, -10, "flame", 55], [0, 10, "flame", 55]);
  defs.push([-10, 0, "warehouse", 45], [10, 0, "warehouse", 45]);
  defs.forEach(([x, z, type, cost], i) => {
    const g = new THREE.Group(),
      c =
        type === "turret"
          ? 0x67b7ff
          : type === "flame"
            ? 0xff8b55
            : type === "warehouse"
              ? 0x9de3a0
              : 0xffd36b,
      ring = new THREE.Mesh(
        new THREE.CylinderGeometry(
          type === "wall" ? 1.28 : 0.78,
          type === "wall" ? 1.28 : 0.78,
          0.07,
          32,
        ),
        new THREE.MeshBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.27,
        }),
      );
    ring.position.y = 0.57;
    g.add(ring);
    const core = box(
      type === "wall" ? 1.15 : 0.46,
      0.08,
      type === "wall" ? 0.22 : 0.46,
      c,
    );
    core.position.y = 0.66;
    g.add(core);
    g.position.set(x, 0, z);
    scene.add(g);
    const gc = getBuildCost({ type, cost }),
      tag = makeGroundTag(
        typeIcon(type) + " " + typeName(type),
        "🌲" + gc.wood + (gc.coal ? "  🪨" + gc.coal : ""),
        c,
        2.7,
        0.8,
      );
    tag.position.set(x, 0.56, z + 1.45);
    buildPads.push({
      g,
      x,
      z,
      type,
      cost,
      built: false,
      progress: 0,
      index: i,
      tag,
    });
  });
}

function getDefenseMaxHp(type, level) {
  const base = type === "wall" ? WALL_HP : type === "warehouse" ? 150 : 110;
  return Math.round(base * (1 + (level - 1) * 0.65));
}

function getUpgradeCost(state) {
  if (state.type === "wall")
    return state.level === 1
      ? { wood: 24, coal: 0 }
      : state.level === 2
        ? { wood: 44, coal: 10 }
        : { wood: 999, coal: 999 };
  if (state.type === "turret")
    return state.level === 1
      ? { wood: 34, coal: 14 }
      : state.level === 2
        ? { wood: 56, coal: 26 }
        : { wood: 999, coal: 999 };
  if (state.type === "flame")
    return state.level === 1
      ? { wood: 38, coal: 22 }
      : state.level === 2
        ? { wood: 60, coal: 38 }
        : { wood: 999, coal: 999 };
  return state.level === 1
    ? { wood: 32, coal: 10 }
    : state.level === 2
      ? { wood: 50, coal: 22 }
      : { wood: 999, coal: 999 };
}

function addWallDecor(x, y, z, level = 1) {
  const k = key(x, y, z);
  if (wallDecorObjs.has(k)) {
    disposeObject(wallDecorObjs.get(k));
    wallDecorObjs.delete(k);
  }
  const g = new THREE.Group(),
    tangent = Math.abs(x) >= Math.abs(z) ? "z" : "x";
  for (let i = -4; i <= 4; i++) {
    const post = box(0.26, 1.75, 0.26, level >= 3 ? 0xd8b06d : 0x8b5c32);
    post.position.y = 1.05;
    if (tangent === "x") post.position.x = i * 0.32;
    else post.position.z = i * 0.32;
    g.add(post);
    const tip = box(0.19, 0.32, 0.19, 0xe3c084);
    tip.position.copy(post.position);
    tip.position.y = 2.08;
    tip.rotation.z = 0.18;
    g.add(tip);
  }
  const rail1 = box(
    tangent === "x" ? 2.9 : 0.22,
    0.18,
    tangent === "x" ? 0.22 : 2.9,
    0x694421,
  );
  rail1.position.y = 1.05;
  g.add(rail1);
  const rail2 = rail1.clone();
  rail2.position.y = 1.55;
  g.add(rail2);
  if (level >= 2) {
    const cap = box(
      tangent === "x" ? 3.05 : 0.3,
      0.14,
      tangent === "x" ? 0.3 : 3.05,
      0xd5a35e,
    );
    cap.position.y = 1.92;
    g.add(cap);
  }
  if (level >= 3) {
    const banner = box(0.2, 0.8, 0.06, 0x6fa9ff);
    banner.position.set(
      tangent === "x" ? 1.15 : 0.15,
      2.45,
      tangent === "x" ? 0.15 : 1.15,
    );
    g.add(banner);
  }
  g.position.set(x, y - 0.5, z);
  scene.add(g);
  wallDecorObjs.set(k, g);
}

function addFlameVisual(x, y, z, level = 1) {
  const k = key(x, y, z);
  if (flameObjs.has(k)) disposeObject(flameObjs.get(k));
  const g = new THREE.Group();
  addVoxelDetails(g, [
    [0.9, 0.35, 0.9, 0x705342, 0, 0.72, 0],
    [0.58, 0.8, 0.58, 0x8f684d, 0, 1.15, 0],
    [1.1, 0.12, 0.3, 0x463025, 0, 1.55, 0],
    [0.3, 0.12, 1.1, 0x463025, 0, 1.55, 0],
  ]);
  const flame = new THREE.PointLight(
    0xff6633,
    1.6 + level * 0.9,
    7 + level * 2,
    1.5,
  );
  flame.position.set(0, 2, 0);
  g.add(flame);
  addVoxelDetails(g, [
    [0.25, 0.55, 0.25, 0xff8b32, 0, 1.95, 0],
    [0.15, 0.38, 0.15, 0xffe074, 0, 2.18, 0],
  ]);
  if (level >= 2)
    addVoxelDetails(g, [
      [0.15, 0.7, 0.15, 0x8fe5ff, -0.45, 1.95, 0],
      [0.15, 0.7, 0.15, 0x8fe5ff, 0.45, 1.95, 0],
    ]);
  g.position.set(x, y, z);
  scene.add(g);
  g.userData.level = level;
  flameObjs.set(k, g);
}

function addWarehouseVisual(x, y, z, level = 1) {
  const k = key(x, y, z);
  if (warehouseObjs.has(k)) disposeObject(warehouseObjs.get(k));
  const g = new THREE.Group();
  addVoxelDetails(g, [
    [1.55, 0.95, 1.35, 0x8f6945, 0, 1, 0],
    [1.75, 0.28, 1.55, 0x594437, 0, 1.67, 0],
    [0.55, 0.48, 0.08, 0x493322, 0, 1.08, 0.72],
  ]);
  for (let i = 0; i < level + 1; i++)
    addVoxelDetails(g, [
      [0.48, 0.34, 0.48, 0xc69a62, -0.55 + i * 0.52, 0.58, 0.78],
    ]);
  if (level >= 3)
    addVoxelDetails(g, [
      [0.22, 0.95, 0.22, 0x6fa9ff, 0.68, 2.1, 0],
      [0.62, 0.3, 0.08, 0xffd36b, 0.68, 2.45, 0],
    ]);
  g.position.set(x, y, z);
  scene.add(g);
  g.userData.level = level;
  warehouseObjs.set(k, g);
}

function addTurretVisual(x, y, z, level = 1) {
  const k = key(x, y, z);
  if (turretObjs.has(k)) disposeObject(turretObjs.get(k));
  const g = new THREE.Group(),
    pole = box(0.22, 1.05, 0.22, level >= 3 ? 0x7b8ca2 : 0x586c80);
  pole.position.y = 1.02;
  g.add(pole);
  addVoxelDetails(g, [
    [0.6, 0.14, 0.6, level >= 2 ? 0x95aac0 : 0x7f94a8, 0, 1.55, 0],
    [0.74, 0.12, 0.18, 0xaebed0, 0, 1.68, 0],
    [0.18, 0.12, 0.74, 0xaebed0, 0, 1.68, 0],
    [0.14, 0.5, 0.14, 0x3d2b1d, -0.22, 1.94, 0],
    [0.14, 0.5, 0.14, 0x3d2b1d, 0.22, 1.94, 0],
    [0.52, 0.08, 0.08, level >= 2 ? 0xffde89 : 0xe5bf76, 0, 2.05, 0],
  ]);
  if (level >= 2)
    addVoxelDetails(g, [
      [0.94, 0.08, 0.1, 0xffd36b, 0, 2.18, 0],
      [0.1, 0.08, 0.94, 0xffd36b, 0, 2.18, 0],
      [0.18, 0.18, 0.18, 0xffd36b, 0, 2.35, 0],
    ]);
  if (level >= 3)
    addVoxelDetails(g, [
      [0.16, 0.8, 0.16, 0x9ed7ff, 0, 2.52, 0],
      [0.34, 0.12, 0.34, 0xffecad, 0, 2.96, 0],
      [0.12, 0.38, 0.12, 0x8fe5ff, -0.42, 2.08, 0],
      [0.12, 0.38, 0.12, 0x8fe5ff, 0.42, 2.08, 0],
    ]);
  g.position.set(x, y, z);
  scene.add(g);
  g.userData.level = level;
  turretObjs.set(k, g);
}

function refreshDefenseVisual(x, y, z) {
  const st = defenseState.get(key(x, y, z));
  if (!st) return;
  if (st.type === "turret") addTurretVisual(x, y, z, st.level);
  else if (st.type === "flame") addFlameVisual(x, y, z, st.level);
  else if (st.type === "warehouse") addWarehouseVisual(x, y, z, st.level);
  else addWallDecor(x, y, z, st.level);
}

function findUpgradeableDefenseNear() {
  let best = null,
    bd = 1.45;
  defenseState.forEach((st, k) => {
    if (st.level >= MAX_DEF_LV) return;
    const [x, y, z] = k.split(",").map(Number),
      d = Math.hypot(x - pPos.x, z - pPos.z);
    if (d < bd) {
      bd = d;
      best = { x, y, z, state: st };
    }
  });
  return best;
}

function upgradeDefense(hit) {
  const st = hit.state,
    cost = getUpgradeCost(st);
  if (wood < cost.wood || coal < cost.coal) return false;
  wood -= cost.wood;
  coal -= cost.coal;
  st.level++;
  st.maxHp = getDefenseMaxHp(st.type, st.level);
  st.hp = st.maxHp;
  if (st.type === "warehouse") warehouseBonus += 25;
  const b = blockAt(hit.x, hit.y, hit.z);
  if (b) b.hp = st.maxHp;
  refreshDefenseVisual(hit.x, hit.y, hit.z);
  spawnPickupTrail(
    player.position.x,
    1.1,
    player.position.z,
    st.type === "turret" ? 0x8ed1ff : 0xffd27a,
    12,
    new THREE.Vector3(hit.x, 1.25, hit.z),
  );
  burst(hit.x, 1.2, hit.z, st.type === "turret" ? 0x8ed1ff : 0xffd27a, 18);
  worldPop(
    typeName(st.type) + " Lv." + st.level,
    new THREE.Vector3(hit.x, 2.3, hit.z),
    "#ffe19a",
  );
  sfx("upgrade");
  showWaveBanner("UPGRADE!", typeName(st.type) + " Lv." + st.level);
  toast(
    typeIcon(st.type) +
      " " +
      typeName(st.type) +
      " をLv." +
      st.level +
      "に進化",
  );
  updateHUD();
  return true;
}

function updateDefenseUpgrades(dt) {
  if (phase !== "day") return;
  const hit = findUpgradeableDefenseNear();
  if (!hit) return;
  const st = hit.state,
    cost = getUpgradeCost(st);
  if (wood >= cost.wood && coal >= cost.coal) {
    st._progress = (st._progress || 0) + dt;
    if (Math.random() < dt * 8)
      spawnPickupTrail(
        player.position.x,
        0.95,
        player.position.z,
        st.type === "turret" ? 0x8ed1ff : 0xffd27a,
        2,
        new THREE.Vector3(hit.x, 1.2, hit.z),
      );
    if (st._progress > 0.48) {
      st._progress = 0;
      upgradeDefense(hit);
    }
  } else {
    st._progress = 0;
    if (Math.random() < dt * 0.6)
      toast(
        (st.type === "turret" ? "🏹" : "🧱") +
          " 進化に 木材" +
          cost.wood +
          " / 石炭" +
          cost.coal +
          " が必要",
      );
  }
}

function getBuildCost(p) {
  if (p.type === "flame") return { wood: p.cost, coal: 18 };
  if (p.type === "warehouse") return { wood: p.cost, coal: 8 };
  return { wood: p.cost, coal: 0 };
}

function updateDefenseCombat(dt, t) {
  for (const [k, g] of turretObjs) {
    const [tx, ty, tz] = k.split(",").map(Number),
      st = defenseState.get(k),
      lv = st ? st.level : 1,
      range =
        (T_RANGE + (lv - 1) * 2.1) * (nightModifier === "blizzard" ? 0.75 : 1),
      rate = Math.max(0.34, T_RATE - (lv - 1) * 0.12),
      dmg = Math.round(turretDmg * (1 + (lv - 1) * 0.55));
    g._cd = (g._cd || 0) - dt;
    if (g._cd > 0) continue;
    let best = null,
      bd = 1e9;
    for (const e of enemies) {
      const d = g.position.distanceTo(e.model.g.position);
      if (d < range && d < bd) {
        bd = d;
        best = e;
      }
    }
    if (best) {
      g._cd = rate;
      const from = new THREE.Vector3(tx, ty + 2.1, tz),
        dir = best.model.g.position
          .clone()
          .add(new THREE.Vector3(0, 0.8, 0))
          .sub(from)
          .normalize();
      shootArrow(from, dir, dmg, best);
      sfx("shoot");
    }
  }
  for (const [k, g] of flameObjs) {
    const st = defenseState.get(k);
    if (!st) continue;
    const [x, y, z] = k.split(",").map(Number),
      lv = st.level;
    g._cd = (g._cd || 0) - dt;
    if (g._cd > 0) continue;
    const range = 4.2 + lv * 0.65,
      targets = enemies.filter(
        (e) =>
          Math.hypot(e.model.g.position.x - x, e.model.g.position.z - z) <
          range,
      );
    if (targets.length) {
      sfx("flame");
      g._cd = Math.max(0.55, 1.15 - lv * 0.18);
      for (const e of targets.slice(0, 3 + lv)) {
        e.hp -= 10 + lv * 9;
        burst(e.model.g.position.x, 0.8, e.model.g.position.z, 0xff6b38, 4);
      }
      burst(x, 1.5, z, 0xff8a42, 10);
    }
  }
}
