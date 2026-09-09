// base system — v12, integrated from the deployed v11.

function baseUpgradeCost() {
  return baseLevel === 1
    ? { wood: 70, coal: 20, iron: 0 }
    : baseLevel === 2
      ? { wood: 110, coal: 45, iron: 0 }
      : baseLevel === 3
        ? { wood: 150, coal: 65, iron: 20 }
        : baseLevel === 4
          ? { wood: 210, coal: 90, iron: 45 }
          : { wood: 999, coal: 999, iron: 999 };
}

function baseLevelName() {
  return baseLevel === 1
    ? "焚き火"
    : baseLevel === 2
      ? "炉付きキャンプ"
      : baseLevel === 3
        ? "防衛集落"
        : baseLevel === 4
          ? "要塞拠点"
          : "極寒要塞";
}

function refreshBaseVisual() {
  fireGroup.scale.setScalar(1 + baseLevel * 0.12);
  fireLight.distance = 14 + baseLevel * 4;
  fireLight.intensity = 2 + baseLevel * 0.45;
  if (baseLevel >= 2 && !fireGroup.userData.ring2) {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const b = box(0.22, 0.55, 0.22, 0x8d684b),
        a = (i / 8) * Math.PI * 2;
      b.position.set(Math.cos(a) * 1.45, 0.85, Math.sin(a) * 1.45);
      g.add(b);
    }
    fireGroup.add(g);
    fireGroup.userData.ring2 = g;
  }
  if (baseLevel >= 3 && !fireGroup.userData.tower) {
    const g = new THREE.Group(),
      core = box(1.2, 1, 1.2, 0x8e6848);
    core.position.y = 0.7;
    g.add(core);
    const roof = box(1.5, 0.28, 1.5, 0x53677d);
    roof.position.y = 1.35;
    g.add(roof);
    fireGroup.add(g);
    fireGroup.userData.tower = g;
  }
  if (baseLevel >= 4 && !fireGroup.userData.beacon) {
    const g = new THREE.Group(),
      mast = box(0.22, 2.2, 0.22, 0xb4c6d8);
    mast.position.y = 1.7;
    g.add(mast);
    const flag = box(0.75, 0.35, 0.08, 0x7ebcff);
    flag.position.set(0.38, 2.55, 0);
    g.add(flag);
    fireGroup.add(g);
    fireGroup.userData.beacon = g;
  }
  if (baseLevel >= 5 && !fireGroup.userData.crown) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const p = box(0.16, 1.25, 0.16, 0xd6ecff),
        a = (i / 4) * Math.PI * 2;
      p.position.set(Math.cos(a), 2, Math.sin(a));
      g.add(p);
    }
    const crown = box(2.35, 0.18, 2.35, 0xffd979);
    crown.position.y = 2.72;
    g.add(crown);
    fireGroup.add(g);
    fireGroup.userData.crown = g;
  }
}

function upgradeBase() {
  if (baseLevel >= 5) return false;
  const c = baseUpgradeCost();
  if (wood < c.wood || coal < c.coal || iron < c.iron) return false;
  wood -= c.wood;
  coal -= c.coal;
  iron -= c.iron;
  baseLevel++;
  baseUpgradeProgress = 0;
  baseMax += 120;
  baseHP = baseMax;
  fuel = Math.min(100, fuel + 35);
  moveSpeed *= 1.04;
  playerDmg = Math.round(playerDmg * 1.08);
  if (baseLevel >= 2) {
    ensureWorkers();
    wood += 20;
  }
  if (baseLevel >= 3) {
    warehouseBonus += 25;
    coal += 15;
  }
  refreshBaseVisual();
  updateCampVisual();
  updateHUD();
  sfx("base");
  showWaveBanner(
    "🏰 BASE Lv." + baseLevel,
    baseLevelName() + " / 新エリア解放",
  );
  worldPop("拠点 Lv." + baseLevel, new THREE.Vector3(0, 3.2, 0), "#ffd98b");
  return true;
}

function updateBaseUpgrade(dt) {
  if (phase !== "day" || baseLevel >= 5) return;
  const d = Math.hypot(pPos.x, pPos.z);
  if (d > 2.8) {
    baseUpgradeProgress = 0;
    return;
  }
  const c = baseUpgradeCost();
  if (wood >= c.wood && coal >= c.coal && iron >= c.iron) {
    baseUpgradeProgress += dt;
    if (baseUpgradeProgress > 0.65) upgradeBase();
  } else baseUpgradeProgress = 0;
}

function addSettlementPiece(kind, x, z) {
  const g = new THREE.Group();
  if (kind === "tent") {
    const base = box(1.45, 0.56, 1.18, 0xb66e48);
    base.position.y = 0.82;
    g.add(base);
    addVoxelDetails(g, [
      [1.62, 0.18, 1.35, 0xe1b36b, 0, 1.18, 0],
      [1.2, 0.12, 1.48, 0xd89a56, 0, 1.31, 0],
      [0.18, 0.42, 0.06, 0x5d3c2c, 0, 0.76, 0.62],
      [0.24, 0.16, 0.06, 0xffc561, 0.35, 0.92, 0.63],
    ]);
  } else {
    const base = box(1.68, 0.94, 1.48, 0x956139);
    base.position.y = 1;
    g.add(base);
    addVoxelDetails(g, [
      [1.9, 0.22, 1.7, 0x665043, 0, 1.55, 0],
      [1.62, 0.18, 1.86, 0x554137, 0, 1.72, 0],
      [0.34, 0.42, 0.06, 0x553523, 0, 1.05, 0.78],
      [0.29, 0.3, 0.06, 0xffc968, 0.48, 1.12, 0.78],
      [0.29, 0.3, 0.06, 0xffc968, -0.48, 1.12, 0.78],
      [0.26, 0.52, 0.26, 0x705446, 0.62, 1.96, -0.38],
    ]);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  settlementObjs.push(g);
}

function updateCampVisual() {
  settlementObjs.forEach((g) => disposeObject(g));
  settlementObjs = [];
  if (day >= 2) {
    addSettlementPiece("tent", -1.9, 1.1);
    addSettlementPiece("tent", 2, 1);
  }
  if (day >= 3) addSettlementPiece("hut", -2.3, -1.4);
  if (day >= 4) addSettlementPiece("hut", 2.4, -1.4);
  if (day >= 5) {
    addSettlementPiece("tent", -4.2, 1.8);
    addSettlementPiece("tent", 4.2, 1.8);
  }
  fireGroup.scale.setScalar(1 + Math.min(day - 1, 5) * 0.08);
  fireLight.distance = 14 + Math.min(day, 6) * 2;
}

function clearCampExtras() {
  for (const o of [...buildPads, ...workerObjs, ...settlementObjs])
    if (o.g) disposeObject(o.g);
    else disposeObject(o);
  buildPads.forEach((p) => p.labelEl?.remove());
  buildPads = [];
  workerObjs = [];
  settlementObjs = [];
  wallDecorObjs.forEach((g) => disposeObject(g));
  wallDecorObjs.clear();
  turretObjs.forEach((g) => disposeObject(g));
  turretObjs.clear();
  flameObjs.forEach((g) => disposeObject(g));
  flameObjs.clear();
  warehouseObjs.forEach((g) => disposeObject(g));
  warehouseObjs.clear();
  defenseLabelEls.forEach((el) => el.remove());
  defenseLabelEls.clear();
  defenseState.clear();
}

function resetBaseVisual() {
  for (const value of Object.values(fireGroup.userData))
    if (value?.isObject3D) disposeObject(value);
  fireGroup.userData = {};
  fireGroup.scale.setScalar(1);
}

function updateAutoFuel(dt, t) {
  fuelAutoCD -= dt;
  if (
    Math.hypot(pPos.x, pPos.z) < 2.2 &&
    fuel < 78 &&
    coal >= 10 &&
    fuelAutoCD <= 0
  ) {
    coal -= 10;
    fuel = Math.min(100, fuel + 30);
    fuelAutoCD = 1.2;
    spawnPickupTrail(
      player.position.x,
      1,
      player.position.z,
      0xffb35c,
      8,
      new THREE.Vector3(0, 1, 0),
    );
    burst(0, 1, 0, 0xffaa44, 12);
    toast("🔥 石炭を自動投入 +30%");
    updateHUD();
  }
}
