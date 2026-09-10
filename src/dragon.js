// Frost dragon: ground X/Z governs range; visible flight body governs aim and hits.
let activeDragon = null;
const dragonUp = new THREE.Vector3(0, 1, 0);
function makeDragon() {
  const g = new THREE.Group(),
    flight = new THREE.Group(),
    wings = [];
  g.add(flight);
  flight.position.y = 3;
  addVoxelDetails(flight, [
    [1.25, 0.85, 2.5, 0x243e56, 0, 0, 0],
    [0.85, 0.28, 2.1, 0x8ebfcb, 0, -0.48, 0.2],
    [0.72, 0.65, 1.1, 0x315369, 0, 0.3, 1.35],
    [1, 0.65, 1, 0x315369, 0, 0.35, 2.05],
    [0.78, 0.25, 0.65, 0x8ba9b8, 0, 0.15, 2.65],
    [0.15, 0.17, 0.35, 0x90fff3, -0.5, 0.52, 2.25],
    [0.15, 0.17, 0.35, 0x90fff3, 0.5, 0.52, 2.25],
    [0.2, 0.8, 0.2, 0xc0eff4, -0.4, 0.95, 1.8],
    [0.2, 0.8, 0.2, 0xc0eff4, 0.4, 0.95, 1.8],
    [0.6, 0.5, 0.95, 0x315369, 0, -0.05, -1.6],
    [0.38, 0.35, 0.9, 0x41687f, 0, 0.05, -2.4],
    [0.2, 0.24, 0.75, 0xa1dce2, 0, 0.2, -3.12],
  ]);
  for (let i = 0; i < 5; i++)
    addVoxelDetails(flight, [
      [0.22, 0.38, 0.26, 0xa1dce2, 0, 0.57, 1 - i * 0.65],
    ]);
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.55, 0.35, 0);
    addVoxelDetails(wing, [
      [1.25, 0.17, 0.25, 0x84b8cb, side * 0.55, 0, 0.65],
      [1.2, 0.14, 0.22, 0x84b8cb, side * 1.7, 0, 0.35],
      [1.3, 0.12, 0.18, 0xb9edf1, side * 2.7, 0, -0.1],
      [1.1, 0.09, 1.9, 0x3e718b, side * 0.6, -0.08, -0.18],
      [1.15, 0.08, 1.45, 0x467d95, side * 1.7, -0.08, -0.35],
      [0.95, 0.07, 0.8, 0x5794a6, side * 2.7, -0.08, -0.4],
    ]);
    flight.add(wing);
    wings.push(wing);
    addVoxelDetails(flight, [
      [0.28, 0.55, 0.3, 0x315369, side * 0.65, -0.55, -0.65],
      [0.3, 0.16, 0.52, 0xc0dce3, side * 0.65, -0.9, -0.4],
    ]);
  }
  const shadow = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.24, 24),
    new THREE.MeshBasicMaterial({ color: 0x52778a, side: THREE.DoubleSide }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.055;
  g.add(shadow);
  const warning = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.42, 32),
    new THREE.MeshBasicMaterial({ color: 0xffbf67, side: THREE.DoubleSide }),
  );
  warning.rotation.x = -Math.PI / 2;
  warning.visible = false;
  g.add(warning);
  const breath = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.36, 1, 6),
    new THREE.MeshBasicMaterial({ color: 0x8effed }),
  );
  breath.visible = false;
  g.add(breath);
  return { g, flight, wings, shadow, warning, breath, legs: [] };
}
function enemyAimPoint(e) {
  return e.model.g.position
    .clone()
    .add(
      new THREE.Vector3(0, e.model.flight ? e.model.flight.position.y : 0.8, 0),
    );
}
function enemyTargetable(e) {
  return e.hp > 0 && !(e.kind === "boss" && e.dragonAge < 2.2);
}
function dragonBreathInterval(e) {
  return e.hp <= e.max * 0.5 ? 3.6 : 4.5;
}
function dragonExposed(e) {
  return e.breathFlash > 0 || e.breathClock >= dragonBreathInterval(e) - 1.25;
}
function damageEnemy(e, amount) {
  if (!enemyTargetable(e)) return false;
  // Armored in flight; descending to breathe is the player's damage window.
  const factor = e.kind === "boss" ? (dragonExposed(e) ? 1.25 : 0.6) : 1;
  e.hp -= amount * factor;
  return true;
}
function announceDragon(e) {
  activeDragon = e;
  e.dragonAge = 0;
  e.breathClock = 0;
  e.breathFlash = 0;
  e.bar.visible = false;
  e.model.g.children.forEach((o) => {
    if (o === e.model.g.userData.hpBack) o.visible = false;
  });
  showWaveBanner("霜翼竜、襲来", "空を旋回する巨影を迎え撃て");
  sfx("boss");
}
function updateDragon(e, dt) {
  if (dt <= 0) return;
  const m = e.model,
    g = m.g;
  e.dragonAge += dt;
  e.breathFlash = Math.max(0, e.breathFlash - dt);
  const radius = Math.hypot(g.position.x, g.position.z);
  let dx, dz;
  if (radius > 6.2) {
    dx = (-g.position.x / (radius || 1)) * 4;
    dz = (-g.position.z / (radius || 1)) * 4;
  } else {
    const a = Math.atan2(g.position.z, g.position.x) + dt * 0.34;
    dx = (Math.cos(a) * 6 - g.position.x) / dt;
    dz = (Math.sin(a) * 6 - g.position.z) / dt;
    if (e.dragonAge >= 2.2) e.breathClock += dt;
    if (e.breathClock >= dragonBreathInterval(e)) {
      e.breathClock = 0;
      e.breathFlash = 0.4;
      baseHP -= e.dmg;
      fuel = Math.max(0, fuel - e.dmg * 0.3);
      burst(0, 1, 0, 0x9dfff2, 18);
      sfx("frostBreath");
      flash();
    }
  }
  g.position.x += dx * dt;
  g.position.z += dz * dt;
  const warning = e.breathClock >= dragonBreathInterval(e) - 1.25;
  g.rotation.y =
    warning || e.breathFlash > 0
      ? Math.atan2(-g.position.x, -g.position.z)
      : Math.atan2(dx, dz);
  const flightHeight =
    (warning || e.breathFlash > 0 ? 1.9 : 3) + Math.sin(e.dragonAge * 2) * 0.2;
  m.flight.position.y +=
    (flightHeight - m.flight.position.y) * Math.min(1, dt * 5);
  m.wings.forEach(
    (w, i) =>
      (w.rotation.z =
        (i === 0 ? -1 : 1) * (0.16 + Math.sin(e.dragonAge * 4) * 0.42)),
  );
  m.warning.position
    .set(-g.position.x, 0.08, -g.position.z)
    .applyAxisAngle(dragonUp, -g.rotation.y);
  m.warning.visible = warning;
  m.warning.material.color.set(
    Math.sin(e.dragonAge * 14) > 0 ? 0xffbf67 : 0xffe4b5,
  );
  m.breath.visible = e.breathFlash > 0;
  if (m.breath.visible) {
    const from = new THREE.Vector3(0, m.flight.position.y + 0.1, 2.6),
      to = m.warning.position.clone(),
      direction = to.clone().sub(from);
    m.breath.position.copy(from).add(to).multiplyScalar(0.5);
    m.breath.scale.y = direction.length();
    m.breath.quaternion.setFromUnitVectors(dragonUp, direction.normalize());
  }
  e.bar.scale.x = Math.max(0.01, e.hp / e.max);
}
function resetDragon() {
  activeDragon = null;
  $("bossPanel").hidden = true;
  $("bossDirection").hidden = true;
  $("gameViewport").classList.remove("boss-active");
}
function updateDragonUI() {
  const e = activeDragon,
    visible = !!e && (running || !!victoryScene);
  $("bossPanel").hidden = !visible;
  $("bossDirection").hidden = true;
  if (!visible) {
    $("gameViewport").classList.remove("boss-active");
    return;
  }
  $("gameViewport").classList.add("boss-active");
  const pct = Math.max(0, Math.ceil((e.hp / e.max) * 100));
  $("bossHealth").textContent = pct + "%";
  $("bossFill").style.width = pct + "%";
  $("bossState").textContent =
    e.hp <= 0
      ? "撃破！"
      : e.dragonAge < 2.2
        ? "飛来中"
        : dragonExposed(e)
          ? "氷息の予兆・弱点露出！"
          : e.hp <= e.max * 0.5
            ? "怒り・氷息が加速／飛行装甲"
            : "飛行装甲・降下時が攻撃チャンス";
  if (e.hp <= 0) return;
  const rect = renderer.domElement.getBoundingClientRect(),
    top = $("hud").getBoundingClientRect().bottom - rect.top + 24;
  const v = enemyAimPoint(e).project(camera),
    x = (v.x * 0.5 + 0.5) * rect.width,
    y = (-v.y * 0.5 + 0.5) * rect.height;
  if (
    v.z > -1 &&
    v.z < 1 &&
    x > 24 &&
    x < rect.width - 24 &&
    y > top &&
    y < rect.height - 24
  )
    return;
  let dx = x - rect.width / 2,
    dy = y - rect.height / 2;
  if (v.z > 1) {
    dx = -dx;
    dy = -dy;
  }
  const left = 30,
    right = rect.width - 30,
    bottom = rect.height - 30,
    cy = Math.max(top, Math.min(bottom, rect.height / 2));
  const scale = Math.min(
    (rect.width / 2 - 30) / Math.max(0.001, Math.abs(dx)),
    (dy < 0 ? Math.max(1, cy - top) : Math.max(1, bottom - cy)) /
      Math.max(0.001, Math.abs(dy)),
  );
  const marker = $("bossDirection");
  marker.hidden = false;
  marker.style.left =
    Math.max(left, Math.min(right, rect.width / 2 + dx * scale)) + "px";
  marker.style.top = Math.max(top, Math.min(bottom, cy + dy * scale)) + "px";
  $("bossArrow").style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
}
