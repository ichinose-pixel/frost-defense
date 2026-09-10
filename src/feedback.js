// Presentation only: never changes resources, combat statistics or player position.
// A fixed backpack, one instanced debris draw and one progress strip bound mobile cost.
const cargoColors = { wood: 0xdba66a, coal: 0x53677c, iron: 0xa0c8e0 };
let cargoMeshes = [],
  harvestTool = null,
  toolBlade = null,
  toolCore = null;
let equipmentLevel = 0,
  harvestSwing = 0,
  cargoBounce = 0;
let voxelDebris = null,
  actionStrip = null;
const voxelFragments = [],
  feedbackDummy = new THREE.Object3D();
const VOXEL_LIMIT = 96;

function buildPlayerFeedback() {
  cargoMeshes = [];
  equipmentLevel = 0;
  const pack = box(0.64, 0.55, 0.22, 0x624c39);
  pack.position.set(0, 1.05, -0.3);
  player.add(pack);
  addVoxelDetails(player, [
    [0.08, 0.66, 0.05, 0xd2ae73, -0.22, 1.04, -0.44],
    [0.08, 0.66, 0.05, 0xd2ae73, 0.22, 1.04, -0.44],
  ]);
  for (const [column, type] of ["wood", "coal", "iron"].entries()) {
    for (let i = 0; i < 4; i++) {
      const mesh = box(
        type === "wood" ? 0.3 : 0.18,
        0.14,
        type === "wood" ? 0.2 : 0.18,
        cargoColors[type],
      );
      mesh.position.set((column - 1) * 0.24, 1.37 + i * 0.16, -0.34);
      mesh.visible = false;
      player.add(mesh);
      cargoMeshes.push({ mesh, type, index: i });
    }
  }
  harvestTool = new THREE.Group();
  const handle = box(0.08, 0.62, 0.08, 0x94623d);
  harvestTool.add(handle);
  toolBlade = box(0.32, 0.23, 0.12, 0xc1dbe4);
  toolBlade.position.set(0.1, -0.24, 0);
  harvestTool.add(toolBlade);
  toolCore = box(0.13, 0.15, 0.15, 0xffb64f);
  toolCore.position.set(0, -0.23, 0);
  harvestTool.add(toolCore);
  harvestTool.position.set(0, -0.5, 0.19);
  harvestTool.rotation.z = -0.25;
  limbs.armR.add(harvestTool);
  updatePlayerFeedback(0);
}
function updatePlayerFeedback(dt) {
  if (!harvestTool) return;
  if (equipmentLevel !== baseLevel) {
    equipmentLevel = baseLevel;
    toolBlade.scale.set(baseLevel >= 3 ? 1.35 : 1, baseLevel >= 2 ? 1.2 : 1, 1);
    toolBlade.material.color.set(
      baseLevel >= 4 ? 0xffb957 : baseLevel >= 2 ? 0x85d5e7 : 0xc1dbe4,
    );
    toolCore.visible = baseLevel >= 3;
  }
  cargoBounce = Math.max(0, cargoBounce - dt);
  const inventory = { wood, coal, iron };
  for (const c of cargoMeshes) {
    // Each visible piece represents a band of stock, not a capacity or another inventory.
    c.mesh.visible =
      c.index < Math.min(4, Math.ceil(Math.max(0, inventory[c.type]) / 25));
    c.mesh.scale.setScalar(1 + Math.sin((cargoBounce / 0.3) * Math.PI) * 0.12);
  }
  harvestSwing = Math.max(0, harvestSwing - dt);
  harvestTool.visible = phase === "day" || harvestSwing > 0;
  if (harvestSwing > 0 && !(phase === "night" && shootCD > 0.25))
    limbs.armR.rotation.x =
      -0.4 - Math.sin((1 - harvestSwing / 0.24) * Math.PI) * 1.5;
}
function harvestFeedback(x, y, z, type) {
  harvestSwing = 0.24;
  cargoBounce = 0.3;
  if (!movementRequested() && phase === "day")
    player.rotation.y = Math.atan2(x - pPos.x, z - pPos.z);
}
function ensureFeedbackMeshes() {
  if (!voxelDebris) {
    voxelDebris = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial(),
      VOXEL_LIMIT,
    );
    voxelDebris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    voxelDebris.count = 0;
    voxelDebris.frustumCulled = false;
    scene.add(voxelDebris);
    actionStrip = box(1, 0.035, 0.12, 0xffd36b);
    actionStrip.visible = false;
    scene.add(actionStrip);
  }
}
function spawnVoxelBreakup(x, y, z, color, count = 3) {
  ensureFeedbackMeshes();
  for (let i = 0; i < count && voxelFragments.length < VOXEL_LIMIT; i++)
    voxelFragments.push({
      x: x + (Math.random() - 0.5) * 0.45,
      y,
      z: z + (Math.random() - 0.5) * 0.45,
      vx: (Math.random() - 0.5) * 4,
      vy: 1.5 + Math.random() * 2,
      vz: (Math.random() - 0.5) * 4,
      age: 0,
      life: 0.55 + Math.random() * 0.25,
      size: 0.14 + Math.random() * 0.13,
      color,
    });
}
function updateVoxelBreakup(dt) {
  if (!voxelDebris) return;
  for (let i = voxelFragments.length - 1; i >= 0; i--) {
    const f = voxelFragments[i];
    f.age += dt;
    if (f.age >= f.life) {
      voxelFragments.splice(i, 1);
      continue;
    }
    f.vy -= 10 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.z += f.vz * dt;
    if (f.y < 0.6) {
      f.y = 0.6;
      f.vy = Math.abs(f.vy) * 0.22;
      f.vx *= 0.7;
      f.vz *= 0.7;
    }
  }
  voxelDebris.count = voxelFragments.length;
  voxelFragments.forEach((f, i) => {
    feedbackDummy.position.set(f.x, f.y, f.z);
    feedbackDummy.rotation.set(f.age * 6, f.age * 4, f.age * 3);
    feedbackDummy.scale.setScalar(
      f.size * Math.min(1, (f.life - f.age) / 0.18),
    );
    feedbackDummy.updateMatrix();
    voxelDebris.setMatrixAt(i, feedbackDummy.matrix);
    voxelDebris.setColorAt(i, new THREE.Color(f.color));
  });
  voxelDebris.instanceMatrix.needsUpdate = true;
  if (voxelDebris.instanceColor) voxelDebris.instanceColor.needsUpdate = true;
}
function showResourceDelivery(cost, x, z) {
  // Call only AFTER the authoritative transaction succeeds. Visual packets never charge.
  for (const type of ["wood", "coal", "iron"]) {
    if (!(cost[type] > 0)) continue;
    const count = Math.min(4, Math.ceil(cost[type] / 10));
    for (let i = 0; i < count && flyPickups.length < 128; i++) {
      const mesh =
        pickupPool.pop() || new THREE.Mesh(pickupGeometry, pickupMaterial);
      mesh.material =
        pickupMaterials.get(cargoColors[type]) ||
        makePickupMaterial(cargoColors[type]);
      mesh.scale.set(type === "wood" ? 0.35 : 0.22, 0.2, 0.22);
      const from = pPos.clone().add(new THREE.Vector3(0, 1.05, 0));
      mesh.position.copy(from);
      mesh.visible = false;
      scene.add(mesh);
      flyPickups.push({
        mesh,
        delivery: true,
        from,
        target: new THREE.Vector3(x, 1, z),
        age: -i * 0.07,
        duration: 0.45,
      });
    }
  }
  sfx("deliver");
}
function updateActionStrip() {
  ensureFeedbackMeshes();
  actionStrip.visible = false;
  if (!running) return;
  const tag = focusedGroundTag();
  if (!tag) return;
  let q = 0,
    width = 1.5,
    depth = 1.5;
  const pad = buildPads.find((p) => p.tag === tag);
  if (pad) {
    const f = defenseFootprint(pad.type, pad.x, pad.z);
    width = f.width;
    depth = f.depth;
    const site = constructionSites.find((s) => s.p === pad);
    const st = defenseState.get(key(pad.x, 1, pad.z));
    q = site
      ? Math.min(1, site.t / site.duration)
      : st
        ? (st._progress || 0) / 0.8
        : pad.progress / 0.8;
  } else if (tag === baseGroundTag) {
    q = baseUpgradeProgress / 0.65;
    width = 2.4;
    depth = 4.8;
  }
  if (!(q > 0)) return;
  q = Math.min(1, q);
  actionStrip.visible = true;
  actionStrip.scale.x = width * q;
  actionStrip.position.set(
    tag.position.x - (width * (1 - q)) / 2,
    0.61,
    tag.position.z + depth / 2 + 0.1,
  );
  actionStrip.material.color.set(q >= 1 ? 0x86f0b1 : 0xffd36b);
}
function resetFeedback() {
  voxelFragments.length = 0;
  harvestSwing = cargoBounce = 0;
  if (voxelDebris) voxelDebris.count = 0;
  if (actionStrip) actionStrip.visible = false;
}
