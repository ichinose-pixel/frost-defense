// player system — v12, integrated from the deployed v11.

function buildPlayer() {
  if (player) disposeObject(player);
  player = new THREE.Group();
  const coat = 0x365b8f,
    coat2 = 0x294a78,
    skin = 0xe7b98c,
    fur = 0xe9edf4,
    boot = 0x20344f,
    body = box(0.54, 0.62, 0.34, coat);
  body.position.y = 1.03;
  player.add(body);
  addVoxelDetails(player, [
    [0.16, 0.16, 0.08, coat2, -0.18, 1.14, 0.205],
    [0.16, 0.16, 0.08, coat2, 0.18, 1.14, 0.205],
    [0.42, 0.09, 0.38, 0x6b4b34, 0, 0.82, 0],
    [0.5, 0.1, 0.38, fur, 0, 1.34, 0],
    [0.09, 0.22, 0.05, 0xe7c76d, -0.2, 1.03, 0.205],
    [0.09, 0.22, 0.05, 0xe7c76d, 0.2, 1.03, 0.205],
    [0.28, 0.06, 0.05, 0x9bc9ff, 0, 1.18, 0.205],
  ]);
  const head = box(0.4, 0.4, 0.4, skin);
  head.position.y = 1.56;
  player.add(head);
  addVoxelDetails(player, [
    [0.11, 0.07, 0.035, 0x1c2430, -0.11, 1.59, 0.215],
    [0.11, 0.07, 0.035, 0x1c2430, 0.11, 1.59, 0.215],
    [0.08, 0.06, 0.04, 0xbd7559, 0, 1.49, 0.22],
  ]);
  const hat = box(0.46, 0.15, 0.46, 0xcf3f4d);
  hat.position.y = 1.82;
  player.add(hat);
  addVoxelDetails(player, [
    [0.18, 0.1, 0.5, 0xe9edf4, 0, 1.77, 0],
    [0.18, 0.18, 0.18, 0xe9edf4, 0.17, 1.95, 0],
  ]);
  limbs.armL = box(0.17, 0.56, 0.17, coat);
  limbs.armL.position.set(-0.36, 1.28, 0);
  limbs.armL.geometry.translate(0, -0.24, 0);
  player.add(limbs.armL);
  limbs.armR = box(0.17, 0.56, 0.17, coat);
  limbs.armR.position.set(0.36, 1.28, 0);
  limbs.armR.geometry.translate(0, -0.24, 0);
  player.add(limbs.armR);
  addVoxelDetails(limbs.armL, [[0.19, 0.12, 0.19, fur, 0, -0.48, 0]]);
  addVoxelDetails(limbs.armR, [[0.19, 0.12, 0.19, fur, 0, -0.48, 0]]);
  limbs.legL = box(0.19, 0.58, 0.19, boot);
  limbs.legL.position.set(-0.14, 0.6, 0);
  limbs.legL.geometry.translate(0, -0.29, 0);
  player.add(limbs.legL);
  limbs.legR = box(0.19, 0.58, 0.19, boot);
  limbs.legR.position.set(0.14, 0.6, 0);
  limbs.legR.geometry.translate(0, -0.29, 0);
  player.add(limbs.legR);
  scene.add(player);
}

function solidAt(x, z) {
  for (const [k, st] of defenseState) {
    if (st.type !== "wall") continue;
    const [wx, wy, wz] = k.split(",").map(Number),
      tangent = Math.abs(wx) >= Math.abs(wz) ? "z" : "x",
      along = tangent === "x" ? Math.abs(x - wx) : Math.abs(z - wz),
      across = tangent === "x" ? Math.abs(z - wz) : Math.abs(x - wx);
    if (along <= 1.52 && across <= 0.48) return blockAt(wx, wy, wz);
  }
  for (let y = 1; y <= 2; y++) {
    const b = blockAt(Math.round(x), y, Math.round(z));
    if (b && ["wall", "turret", "flame", "warehouse"].includes(b.t)) return b;
  }
  return null;
}

function nearestFreePosition(x, z) {
  if (!playerCollidesAt(x, z)) return { x, z };
  for (let radius = 0.35; radius <= 3.5; radius += 0.25) {
    const steps = Math.max(12, Math.ceil(radius * 18));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2,
        nx = x + Math.cos(a) * radius,
        nz = z + Math.sin(a) * radius;
      if (Math.max(Math.abs(nx), Math.abs(nz)) > R_INNER - 0.45) continue;
      if (!playerCollidesAt(nx, nz)) return { x: nx, z: nz };
    }
  }
  return { x: 0, z: 4 };
}

function movePlayerWithCollision(dx, dz) {
  const lim = R_INNER - 0.45,
    sx = pPos.x,
    sz = pPos.z,
    tx = Math.max(-lim, Math.min(lim, sx + dx)),
    tz = Math.max(-lim, Math.min(lim, sz + dz));
  if (!playerCollidesAt(tx, tz)) {
    pPos.x = tx;
    pPos.z = tz;
    return;
  }
  if (!playerCollidesAt(tx, sz)) {
    pPos.x = tx;
    return;
  }
  if (!playerCollidesAt(sx, tz)) {
    pPos.z = tz;
    return;
  }
  if (playerCollidesAt(pPos.x, pPos.z)) {
    const safe = nearestFreePosition(pPos.x, pPos.z);
    pPos.x = safe.x;
    pPos.z = safe.z;
  }
}

function resolvePlayerCollision() {
  if (playerCollidesAt(pPos.x, pPos.z)) {
    const safe = nearestFreePosition(pPos.x, pPos.z);
    pPos.x = safe.x;
    pPos.z = safe.z;
  }
}

function updatePlayer(dt, t) {
  let mx =
      (keys.KeyD || keys.ArrowRight ? 1 : 0) -
      (keys.KeyA || keys.ArrowLeft ? 1 : 0) +
      joyVec.x,
    mz =
      (keys.KeyW || keys.ArrowUp ? 1 : 0) -
      (keys.KeyS || keys.ArrowDown ? 1 : 0) +
      joyVec.y,
    ml = Math.hypot(mx, mz);
  if (ml > 1) {
    mx /= ml;
    mz /= ml;
  }
  const right = new THREE.Vector3(
      1,
      0,
      -CAM_OFFSET.x / CAM_OFFSET.z,
    ).normalize(),
    forward = new THREE.Vector3(-CAM_OFFSET.x, 0, -CAM_OFFSET.z).normalize(),
    wx = (right.x * mx + forward.x * mz) * moveSpeed,
    wz = (right.z * mx + forward.z * mz) * moveSpeed;
  movePlayerWithCollision(wx * dt, wz * dt);
  resolvePlayerCollision();
  player.position.copy(pPos);
  gatherRing.position.set(pPos.x, 0.56, pPos.z);
  attackRing.position.set(pPos.x, 0.56, pPos.z);
  attackRing.material.opacity = phase === "night" ? 0.18 : 0.08;
  attackRing.visible = phase === "night";
  if (ml > 0.08) player.rotation.y = Math.atan2(wx, wz);
  const moving = ml > 0.15,
    sw = moving ? Math.sin(t * 11) * 0.7 : 0;
  limbs.legL.rotation.x = sw;
  limbs.legR.rotation.x = -sw;
  limbs.armL.rotation.x = -sw * 0.8;
  limbs.armR.rotation.x = sw * 0.8;
  if (shootCD > 0) shootCD -= dt;
  if (comboT > 0) {
    comboT -= dt;
    if (comboT <= 0) {
      combo = 0;
      $("combo").style.opacity = 0;
    }
  }
  camLook.lerp(
    new THREE.Vector3(pPos.x, pPos.y + 1, pPos.z),
    Math.min(1, dt * 7),
  );
  camera.position.lerp(camLook.clone().add(CAM_OFFSET), Math.min(1, dt * 6));
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.07;
    camera.position.y += (Math.random() - 0.5) * shake * 0.05;
    shake -= dt * 3;
  }
  camera.lookAt(camLook.x, camLook.y + 0.1, camLook.z);
  if (phase === "night" && shootCD <= 0 && enemies.length) {
    let target = null,
      bd = 7.8;
    for (const e of enemies) {
      const d = e.model.g.position.distanceTo(player.position);
      if (d < bd) {
        bd = d;
        target = e;
      }
    }
    if (target) {
      shootCD = 0.42;
      const from = pPos.clone().add(new THREE.Vector3(0, 1.35, 0)),
        dir = target.model.g.position
          .clone()
          .add(new THREE.Vector3(0, 0.8, 0))
          .sub(from)
          .normalize();
      shootArrow(
        from.clone().add(dir.clone().multiplyScalar(0.5)),
        dir,
        playerDmg,
        target,
      );
      sfx("shoot");
      player.rotation.y = Math.atan2(dir.x, dir.z);
      limbs.armR.rotation.x = -1.25;
    }
  }
}
