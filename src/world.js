// world system — v12, integrated from the deployed v11.

function hashJitter(x, y, z) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (z * 83492791);
  h = Math.abs(h % 100) / 100;
  return 0.92 + h * 0.16;
}

function setBlock(x, y, z, t, hp) {
  blocks.set(key(x, y, z), { t, hp: hp || 0 });
  rebuild();
}

function removeBlock(x, y, z) {
  const k = key(x, y, z),
    b = blocks.get(k);
  if (!b) return;
  blocks.delete(k);
  if (turretObjs.has(k)) {
    disposeObject(turretObjs.get(k));
    turretObjs.delete(k);
  }
  if (flameObjs.has(k)) {
    disposeObject(flameObjs.get(k));
    flameObjs.delete(k);
  }
  if (warehouseObjs.has(k)) {
    disposeObject(warehouseObjs.get(k));
    warehouseObjs.delete(k);
  }
  if (wallDecorObjs.has(k)) {
    disposeObject(wallDecorObjs.get(k));
    wallDecorObjs.delete(k);
  }
  if (defenseLabelEls.has(k)) {
    defenseLabelEls.get(k).remove();
    defenseLabelEls.delete(k);
  }
  const st = defenseState.get(k);
  if (st?.type === "warehouse")
    warehouseBonus = Math.max(0, warehouseBonus - 40 - (st.level - 1) * 25);
  defenseState.delete(k);
  if (st) restoreBuildPad(x, z);
  rebuild();
}

function blockAt(x, y, z) {
  return blocks.get(key(x, y, z));
}

function buildTerrain() {
  blocks.clear();
  turretObjs.forEach((g) => disposeObject(g));
  turretObjs.clear();
  flameObjs.forEach((g) => disposeObject(g));
  flameObjs.clear();
  warehouseObjs.forEach((g) => disposeObject(g));
  warehouseObjs.clear();
  wallDecorObjs.forEach((g) => disposeObject(g));
  wallDecorObjs.clear();
  defenseLabelEls.forEach((el) => el.remove());
  defenseLabelEls.clear();
  defenseState.clear();
  for (let x = -WORLD_EDGE; x <= WORLD_EDGE; x++)
    for (let z = -WORLD_EDGE; z <= WORLD_EDGE; z++) {
      const r = Math.max(Math.abs(x), Math.abs(z));
      if (r <= R_INNER) blocks.set(key(x, 0, z), { t: "snow", hp: 0 });
      else if (r <= WORLD_EDGE) {
        const h = 2 + ((((x * 7 + z * 13) % 4) + 4) % 4);
        for (let y = 0; y < h; y++)
          blocks.set(key(x, y, z), { t: "rock", hp: 0 });
      }
    }
  let placed = 0,
    guard = 0;
  while (placed < 42 && guard++ < 2200) {
    const x = ((Math.random() * 2 - 1) * (R_INNER - 3)) | 0,
      z = ((Math.random() * 2 - 1) * (R_INNER - 3)) | 0;
    if (Math.max(Math.abs(x), Math.abs(z)) < 6 || isReservedBuildArea(x, z))
      continue;
    if (Math.abs(x) <= 4 && z >= 2 && z <= 11) continue;
    if (!stageResourceZone("tree", x, z)) continue;
    let ok = true;
    for (let y = 1; y <= 5; y++)
      if (blockAt(x, y, z)) {
        ok = false;
        break;
      }
    if (!ok) continue;
    for (let y = 1; y <= 3; y++) blocks.set(key(x, y, z), { t: "wood", hp: 0 });
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++)
        if (!blockAt(x + dx, 4, z + dz))
          blocks.set(key(x + dx, 4, z + dz), { t: "leaf", hp: 0 });
    blocks.set(key(x, 5, z), { t: "leaf", hp: 0 });
    if (
      Math.random() < 0.35 &&
      !blockAt(x + 2, 1, z + 1) &&
      !isReservedBuildArea(x + 2, z + 1) &&
      stageResourceZone("tree", x + 2, z + 1)
    ) {
      for (let y = 1; y <= 2; y++)
        blocks.set(key(x + 2, y, z + 1), { t: "wood", hp: 0 });
      if (!blockAt(x + 2, 3, z + 1))
        blocks.set(key(x + 2, 3, z + 1), { t: "leaf", hp: 0 });
    }
    placed++;
  }
  placed = 0;
  guard = 0;
  while (placed < 22 && guard++ < 1400) {
    const x = ((Math.random() * 2 - 1) * (R_INNER - 3)) | 0,
      z = ((Math.random() * 2 - 1) * (R_INNER - 3)) | 0;
    if (
      Math.max(Math.abs(x), Math.abs(z)) < 6 ||
      blockAt(x, 1, z) ||
      isReservedBuildArea(x, z) ||
      !stageResourceZone("coal", x, z)
    )
      continue;
    blocks.set(key(x, 1, z), { t: "coal", hp: 0 });
    if (Math.random() < 0.75 && !blockAt(x, 2, z))
      blocks.set(key(x, 2, z), { t: "coal", hp: 0 });
    if (Math.random() < 0.35 && !blockAt(x + 1, 1, z))
      blocks.set(key(x + 1, 1, z), { t: "coal", hp: 0 });
    placed++;
  }
  rebuild();
}

function flushWorld() {
  if (!worldDirty) return;
  worldDirty = false;
  const m = new THREE.Matrix4(),
    c = new THREE.Color();
  let count = 0,
    spare = inst.instanceMatrix.count - blockArr.length;
  for (const e of blockArr) {
    const parts = resourceVisualParts(e);
    if (parts && spare >= parts.length - 1) {
      spare -= parts.length - 1;
      for (const [dx, dy, dz, w, h, d, color] of parts) {
        m.makeScale(w, h, d);
        m.setPosition(e.x + dx, e.y + dy, e.z + dz);
        inst.setMatrixAt(count, m);
        c.setHex(color).multiplyScalar(hashJitter(e.x, e.y, e.z));
        inst.setColorAt(count++, c);
      }
    } else {
      m.makeTranslation(e.x, e.y, e.z);
      inst.setMatrixAt(count, m);
      c.setHex(stageBlockColor(e)).multiplyScalar(hashJitter(e.x, e.y, e.z));
      inst.setColorAt(count++, c);
    }
  }
  inst.count = count;
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
}
function rebuild() {
  worldDirty = true;
  blockArr = [...blocks.entries()].map(([k, b]) => {
    const [x, y, z] = k.split(",").map(Number);
    return { x, y, z, b };
  });
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x182a3a);
  scene.fog = null;
  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(8.6, 12, 14);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  $("gameViewport").appendChild(renderer.domElement);
  clock = new THREE.Clock();
  hemi = new THREE.HemisphereLight(0xcfe5ff, 0x8a97a8, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(20, 30, 10);
  scene.add(sun);
  const geo = new THREE.BoxGeometry(1, 1, 1),
    mat = new THREE.MeshLambertMaterial();
  inst = new THREE.InstancedMesh(geo, mat, 12000);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(inst);
  buildTerrain();
  fireGroup = new THREE.Group();
  const logG = new THREE.BoxGeometry(0.9, 0.25, 0.25),
    logM = new THREE.MeshLambertMaterial({ color: 0x6a4520 });
  for (let i = 0; i < 3; i++) {
    const l = new THREE.Mesh(logG, logM);
    l.rotation.y = (i * Math.PI) / 3;
    l.position.y = 0.6;
    fireGroup.add(l);
  }
  const stoneG = new THREE.BoxGeometry(0.3, 0.3, 0.3),
    stoneM = new THREE.MeshLambertMaterial({ color: 0x777788 });
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(stoneG, stoneM),
      a = (i / 8) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.9, 0.65, Math.sin(a) * 0.9);
    fireGroup.add(s);
  }
  fireLight = new THREE.PointLight(0xff8830, 2.2, 20, 1.2);
  fireLight.position.set(0, 1.6, 0);
  fireGroup.add(fireLight);
  scene.add(fireGroup);
  flameData = Array.from({ length: 36 }, () => ({ life: Math.random() }));
  const fg = new THREE.BufferGeometry();
  fg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(36 * 3), 3),
  );
  flamePts = new THREE.Points(
    fg,
    new THREE.PointsMaterial({
      color: 0xffaa33,
      size: 6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
  scene.add(flamePts);
  debrisData = Array.from({ length: 200 }, () => ({
    life: 0,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    r: 1,
    g: 1,
    b: 1,
  }));
  const dg = new THREE.BufferGeometry();
  dg.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(200 * 3), 3),
  );
  dg.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(200 * 3), 3),
  );
  debrisPts = new THREE.Points(
    dg,
    new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: false,
      depthWrite: false,
    }),
  );
  scene.add(debrisPts);
  ghost = new THREE.Mesh(
    new THREE.BoxGeometry(1.04, 1.04, 1.04),
    new THREE.MeshBasicMaterial({
      color: 0x66ff88,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  ghost.visible = false;
  scene.add(ghost);
  buildPlayer();
  gatherRing = makeRing(2.0, 0x7ee0ff, 0.28);
  scene.add(gatherRing);
  attackRing = makeRing(8.2, 0xffc46f, 0.12);
  scene.add(attackRing);
}

function makeRing(radius, color, opacity) {
  const g = new THREE.RingGeometry(radius - 0.08, radius, 40),
    m = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.56;
  return mesh;
}

function box(w, h, d, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
}

function vbox(w, h, d, color, px = 0, py = 0, pz = 0) {
  const m = box(w, h, d, color);
  m.position.set(px, py, pz);
  return m;
}

function addVoxelDetails(g, defs) {
  for (const d of defs) {
    const m = vbox(d[0], d[1], d[2], d[3], d[4], d[5], d[6]);
    g.add(m);
  }
}

// Dispose resources owned by a removed model; shared pickup assets are pooled separately.
function disposeObject(object) {
  if (!object) return;
  object.removeFromParent();
  const geometries = new Set(),
    materials = new Set();
  object.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) materials.add(m);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

function updateEnvironment(dt, t) {
  nightK += ((phase === "night" ? 1 : 0) - nightK) * Math.min(1, dt * 1.2);
  sun.intensity = 1.15 - nightK * 0.95;
  hemi.intensity = 0.9 - nightK * 0.55;
  const sa = (phase === "day" ? 1 - phaseT / 30 : 0.5) * Math.PI;
  sun.position.set(Math.cos(sa) * 30, Math.max(6, Math.sin(sa) * 30), 10);
  const fr = fuel / 100;
  fireLight.intensity =
    (0.6 + fr * 2.2) * (1 + nightK * 0.8) + Math.sin(t * 11) * 0.25;
  fireLight.distance = 12 + fr * 12;
}
