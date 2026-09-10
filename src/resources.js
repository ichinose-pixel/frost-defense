// resources system — v12, integrated from the deployed v11.

function makeWorker(i) {
  const g = new THREE.Group(),
    body = box(0.36, 0.5, 0.27, 0x6f8bb3);
  body.position.y = 0.88;
  g.add(body);
  addVoxelDetails(g, [
    [0.32, 0.09, 0.3, 0x45617f, 0, 0.72, 0],
    [0.12, 0.12, 0.06, 0xd1e7ff, -0.1, 0.98, 0.17],
    [0.12, 0.12, 0.06, 0xd1e7ff, 0.1, 0.98, 0.17],
  ]);
  const head = box(0.3, 0.3, 0.3, 0xe4b88b);
  head.position.y = 1.28;
  g.add(head);
  const hat = box(0.35, 0.1, 0.35, 0xc98a38);
  hat.position.y = 1.47;
  g.add(hat);
  addVoxelDetails(g, [[0.14, 0.08, 0.39, 0xead6a5, 0, 1.42, 0]]);
  g.position.set((i % 2 ? 1 : -1) * (1 + i * 0.25), 0.5, 1.5);
  scene.add(g);
  workerObjs.push({
    g,
    t: i * 1.7,
    target: null,
    workT: 1 + i * 0.4,
    shootCD: 0.4 + i * 0.12,
  });
}

function ensureWorkers() {
  while (workerObjs.length < Math.min(4, Math.max(0, day - 1)))
    makeWorker(workerObjs.length);
}

function findResourceNear(pos) {
  let best = null,
    bd = 1e9;
  for (const e of blockArr) {
    if (!["wood", "leaf", "coal"].includes(e.b.t)) continue;
    const d = (e.x - pos.x) ** 2 + (e.z - pos.z) ** 2;
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function updateWorkers(dt, t) {
  ensureWorkers();
  workerObjs.forEach((w, idx) => {
    w.workT -= dt;
    w.shootCD -= dt;
    if (phase === "night") {
      let enemy = null,
        bd = 6.2;
      for (const e of enemies) {
        const d = e.model.g.position.distanceTo(w.g.position);
        if (d < bd) {
          bd = d;
          enemy = e;
        }
      }
      if (enemy) {
        const dx = enemy.model.g.position.x - w.g.position.x,
          dz = enemy.model.g.position.z - w.g.position.z,
          d = Math.hypot(dx, dz) || 1;
        w.g.rotation.y = Math.atan2(dx, dz);
        if (d > 3.2) {
          w.g.position.x += (dx / d) * 1.35 * dt;
          w.g.position.z += (dz / d) * 1.35 * dt;
        }
        if (w.shootCD <= 0) {
          w.shootCD = 1.05;
          const from = w.g.position.clone().add(new THREE.Vector3(0, 1.15, 0)),
            dir = enemy.model.g.position
              .clone()
              .add(new THREE.Vector3(0, 0.8, 0))
              .sub(from)
              .normalize();
          shootArrow(
            from,
            dir,
            Math.max(6, Math.round(playerDmg * 0.42)),
            enemy,
          );
        }
        return;
      }
    }
    if (!w.target || !blockAt(w.target.x, w.target.y, w.target.z))
      w.target = findResourceNear(w.g.position);
    if (w.target) {
      const dx = w.target.x - w.g.position.x,
        dz = w.target.z - w.g.position.z,
        d = Math.hypot(dx, dz);
      if (d > 0.9) {
        w.g.position.x += (dx / d) * 1.7 * dt;
        w.g.position.z += (dz / d) * 1.7 * dt;
        w.g.rotation.y = Math.atan2(dx, dz);
      } else if (w.workT <= 0) {
        const b = blockAt(w.target.x, w.target.y, w.target.z);
        if (b) {
          if (b.t === "coal") coal += 2;
          else wood += 2;
          spawnPickupTrail(
            w.target.x,
            w.target.y + 0.55,
            w.target.z,
            b.t === "coal" ? 0x8ea4c4 : 0xe3ba79,
            5,
            player.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
          );
          removeBlock(w.target.x, w.target.y, w.target.z);
          burst(
            w.target.x,
            w.target.y + 0.5,
            w.target.z,
            b.t === "coal" ? 0x454a56 : 0x8a5a2b,
            5,
          );
          updateHUD();
        }
        w.target = null;
        w.workT = 1.3 + Math.random();
      }
    } else {
      const a = t * 0.35 + idx * 1.8,
        tx = Math.cos(a) * 2.3,
        tz = Math.sin(a) * 2.3,
        dx = tx - w.g.position.x,
        dz = tz - w.g.position.z,
        d = Math.hypot(dx, dz) || 1;
      w.g.position.x += (dx / d) * 0.7 * dt;
      w.g.position.z += (dz / d) * 0.7 * dt;
    }
  });
}

function countBlocksOfType(types) {
  let n = 0;
  for (const [, b] of blocks) if (types.includes(b.t)) n++;
  return n;
}

function spawnResourceNode(type) {
  for (let guard = 0; guard < 120; guard++) {
    const x = ((Math.random() * 2 - 1) * (R_INNER - 3)) | 0,
      z = ((Math.random() * 2 - 1) * (R_INNER - 3)) | 0;
    if (Math.max(Math.abs(x), Math.abs(z)) < 7 || isReservedBuildArea(x, z))
      continue;
    if (blockAt(x, 1, z) || blockAt(x, 2, z) || blockAt(x, 3, z)) continue;
    if (type === "tree") {
      for (let y = 1; y <= 3; y++)
        blocks.set(key(x, y, z), { t: "wood", hp: 0 });
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++)
          if (!blockAt(x + dx, 4, z + dz))
            blocks.set(key(x + dx, 4, z + dz), { t: "leaf", hp: 0 });
      blocks.set(key(x, 5, z), { t: "leaf", hp: 0 });
    } else {
      blocks.set(key(x, 1, z), { t: "coal", hp: 0 });
      if (Math.random() < 0.7 && !blockAt(x, 2, z))
        blocks.set(key(x, 2, z), { t: "coal", hp: 0 });
      if (Math.random() < 0.35 && !blockAt(x + 1, 1, z))
        blocks.set(key(x + 1, 1, z), { t: "coal", hp: 0 });
    }
    rebuild();
    return true;
  }
  return false;
}

function updateResourceRespawn(dt) {
  resourceRespawnT -= dt;
  if (resourceRespawnT > 0 || phase !== "day") return;
  resourceRespawnT = 6.5;
  if (countBlocksOfType(["wood", "leaf"]) < 95) spawnResourceNode("tree");
  if (countBlocksOfType(["coal"]) < 28) spawnResourceNode("coal");
}

function harvestCluster(x, y, z, type) {
  let woodGain = 0,
    coalGain = 0,
    removed = [];
  if (type === "coal") {
    for (let dx = 0; dx <= 1; dx++)
      for (let dy = 1; dy <= 2; dy++) {
        const b = blockAt(x + dx, dy, z);
        if (b && b.t === "coal") removed.push([x + dx, dy, z, b]);
      }
  } else {
    for (let dy = 1; dy <= 5; dy++) {
      const b = blockAt(x, dy, z);
      if (b && (b.t === "wood" || b.t === "leaf")) removed.push([x, dy, z, b]);
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const b = blockAt(x + dx, 4, z + dz);
        if (b && b.t === "leaf") removed.push([x + dx, 4, z + dz, b]);
      }
  }
  const uniq = [],
    seen = new Set();
  for (const r of removed) {
    const k = r[0] + "," + r[1] + "," + r[2];
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(r);
    }
  }
  if (!uniq.length) return false;
  for (const [rx, ry, rz, b] of uniq) {
    if (b.t === "coal") coalGain += 2;
    else woodGain += b.t === "wood" ? 2 : 1;
    blocks.delete(key(rx, ry, rz));
    burst(rx, ry + 0.5, rz, b.t === "coal" ? 0x454a56 : 0x8a5a2b, 4);
  }
  rebuild();
  if (woodGain) {
    wood += woodGain;
    sfx("wood");
    spawnPickupTrail(
      x,
      1.2,
      z,
      0xe3ba79,
      Math.min(16, 6 + Math.ceil(woodGain / 2)),
      player.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
    );
    worldPop("+" + woodGain + " 木材", new THREE.Vector3(x, 2.2, z), "#ffd28b");
  }
  if (coalGain) {
    coal += coalGain;
    sfx("coal");
    spawnPickupTrail(
      x,
      1.2,
      z,
      0x8ea4c4,
      Math.min(14, 5 + Math.ceil(coalGain / 2)),
      player.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
    );
    worldPop("+" + coalGain + " 石炭", new THREE.Vector3(x, 2.2, z), "#b8d3ff");
  }
  toast(coalGain ? "+" + coalGain + " 🪨" : "+" + woodGain + " 🌲");
  updateHUD();
  return true;
}

function spawnRescueSurvivor() {
  if (rescueNPC || rescueSpawnedForDay === day || day < 2) return;
  rescueSpawnedForDay = day;
  const a = Math.random() * Math.PI * 2,
    r = 16 + Math.random() * 6,
    g = new THREE.Group(),
    body = box(0.38, 0.54, 0.28, 0x9a5d58);
  body.position.y = 0.9;
  g.add(body);
  const head = box(0.31, 0.31, 0.31, 0xe0b187);
  head.position.y = 1.32;
  g.add(head);
  const scarf = box(0.42, 0.12, 0.34, 0xffd36b);
  scarf.position.y = 1.14;
  g.add(scarf);
  g.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
  scene.add(g);
  rescueNPC = { g };
  worldPop(
    "HELP!",
    g.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
    "#ffe19a",
  );
}

function updateRescue() {
  if (!rescueNPC) return;
  const d = rescueNPC.g.position.distanceTo(player.position);
  if (d < 2) {
    disposeObject(rescueNPC.g);
    rescueNPC = null;
    rescued++;
    makeWorker(workerObjs.length);
    wood += 20;
    coal += 8;
    sfx("rescue");
    showWaveBanner("SURVIVOR RESCUED", "住民 +1 / 資材ボーナス");
    toast("🧑 生存者を救助！住民が増えた");
    updateHUD();
  }
}

function updateAutoHarvest(dt, t) {
  harvestT -= dt;
  if (harvestT <= 0) {
    harvestT = 0.25;
    const px = Math.round(pPos.x),
      pz = Math.round(pPos.z);
    outer: for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        for (let y = 1; y <= 5; y++) {
          const tx = px + dx,
            tz = pz + dz,
            b = blockAt(tx, y, tz);
          if (b && (b.t === "wood" || b.t === "leaf" || b.t === "coal")) {
            harvestCluster(tx, y, tz, b.t);
            break outer;
          }
        }
  }
}
