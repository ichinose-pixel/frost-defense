// effects system — v12, integrated from the deployed v11.

function burst(x, y, z, hex, n = 8) {
  const c = new THREE.Color(hex);
  let done = 0;
  for (const d of debrisData) {
    if (d.life > 0) continue;
    d.life = 0.4 + Math.random() * 0.4;
    d.x = x;
    d.y = y;
    d.z = z;
    d.vx = (Math.random() - 0.5) * 4;
    d.vy = 2 + Math.random() * 3;
    d.vz = (Math.random() - 0.5) * 4;
    d.r = c.r;
    d.g = c.g;
    d.b = c.b;
    if (++done >= n) break;
  }
}

function spawnPickupTrail(x, y, z, colorHex, count, target) {
  for (let i = 0; i < count && flyPickups.length < 128; i++) {
    const mesh =
      pickupPool.pop() || new THREE.Mesh(pickupGeometry, pickupMaterial);
    const size = 0.19 + Math.random() * 0.05;
    mesh.visible = true;
    mesh.scale.set(size, size, colorHex === 0xe3ba79 ? size * 1.7 : size);
    mesh.material =
      pickupMaterials.get(colorHex) || makePickupMaterial(colorHex);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.45,
      y + (Math.random() - 0.5) * 0.25,
      z + (Math.random() - 0.5) * 0.45,
    );
    scene.add(mesh);
    flyPickups.push({
      mesh,
      pos: mesh.position,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0.8 + Math.random() * 0.8,
        (Math.random() - 0.5) * 2,
      ),
      target: target.clone(),
      followPlayer:
        Math.hypot(target.x - player.position.x, target.z - player.position.z) <
        0.1,
      age: 0,
      life: 1.1 + Math.random() * 0.25,
    });
  }
}

function updateParticles(dt) {
  const fp = flamePts.geometry.attributes.position.array,
    fr = fuel / 100;
  flameData.forEach((p, i) => {
    p.life += dt * 1.6;
    if (p.life > 1) p.life = 0;
    const s = p.life;
    fp[i * 3] = Math.sin(i * 7 + s * 9) * 0.25 * (1 - s);
    fp[i * 3 + 1] = 0.7 + s * 1.3 * (0.4 + fr);
    fp[i * 3 + 2] = Math.cos(i * 5 + s * 8) * 0.25 * (1 - s);
  });
  flamePts.geometry.attributes.position.needsUpdate = true;
  flamePts.material.size = 3 + fr * 5;
  flamePts.visible = fuel > 0;
  const dp = debrisPts.geometry.attributes.position.array,
    dc = debrisPts.geometry.attributes.color.array;
  debrisData.forEach((d, i) => {
    if (d.life > 0) {
      d.life -= dt;
      d.vy -= 9 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
    }
    dp[i * 3] = d.x;
    dp[i * 3 + 1] = d.life > 0 ? d.y : -99;
    dp[i * 3 + 2] = d.z;
    dc[i * 3] = d.r;
    dc[i * 3 + 1] = d.g;
    dc[i * 3 + 2] = d.b;
  });
  debrisPts.geometry.attributes.position.needsUpdate = true;
  debrisPts.geometry.attributes.color.needsUpdate = true;
  updatePickups(dt);
  updateDeathEffects(dt);
  updateVoxelBreakup(dt);
}

function worldPop(textMsg, pos, color = "#fff") {
  const v = pos.clone().project(camera);
  if (v.z < -1 || v.z > 1) return;
  const el = document.createElement("div");
  el.className = "worldPop";
  el.textContent = textMsg;
  el.style.color = color;
  const rect = renderer.domElement.getBoundingClientRect();
  el.style.left = (v.x * 0.5 + 0.5) * rect.width + "px";
  el.style.top = (-v.y * 0.5 + 0.5) * rect.height + "px";
  $("gameViewport").appendChild(el);
  setTimeout(() => el.remove(), 760);
}

function showWaveBanner(main, sub = "") {
  const el = $("waveBanner");
  el.innerHTML =
    main +
    (sub
      ? `<div style="font-size:.34em;margin-top:6px;color:#a9cfff;letter-spacing:.12em">${sub}</div>`
      : "");
  el.classList.add("show");
  clearTimeout(el._tm);
  el._tm = setTimeout(() => el.classList.remove("show"), 1200);
}

// Bounded effects: no mesh creation and disposal on every animation frame.
const pickupGeometry = new THREE.BoxGeometry(1, 1, 1),
  pickupMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const pickupMaterials = new Map(),
  pickupPool = [],
  deathEffects = [];
const effectDirection = new THREE.Vector3();
function makePickupMaterial(color) {
  const mat = new THREE.MeshBasicMaterial({ color });
  pickupMaterials.set(color, mat);
  return mat;
}
function recyclePickup(p) {
  scene.remove(p.mesh);
  pickupPool.push(p.mesh);
}
function updatePickups(dt) {
  for (let i = flyPickups.length - 1; i >= 0; i--) {
    const p = flyPickups[i];
    if (p.delivery) {
      p.age += dt;
      const q = Math.max(0, Math.min(1, p.age / p.duration));
      p.mesh.visible = p.age >= 0;
      p.mesh.position.lerpVectors(p.from, p.target, q);
      p.mesh.position.y += Math.sin(q * Math.PI) * 1.3;
      p.mesh.rotation.x += dt * 5;
      if (q >= 1) {
        recyclePickup(p);
        flyPickups.splice(i, 1);
      }
      continue;
    }
    p.age += dt;
    p.life -= dt;
    if (p.followPlayer) p.target.copy(player.position).y += 1.1;
    effectDirection.copy(p.target).sub(p.pos);
    const d = Math.max(0.001, effectDirection.length());
    effectDirection.multiplyScalar((8 + d * 1.6) / d);
    if (p.age > 0.12) p.vel.lerp(effectDirection, Math.min(1, dt * 10));
    p.pos.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 5;
    p.mesh.rotation.z += dt * 3;
    if (p.life <= 0 || (p.age > 0.12 && d < 0.38)) {
      if (p.followPlayer && d < 0.38) sfx("pickup");
      recyclePickup(p);
      flyPickups.splice(i, 1);
    }
  }
}
function spawnDeathEffect(e) {
  if (deathEffects.length >= 24) {
    disposeObject(e.model.g);
    return;
  }
  if (e.model.flight) {
    e.model.shadow.visible =
      e.model.warning.visible =
      e.model.breath.visible =
        false;
  }
  const g = e.model.g,
    dx = g.position.x - pPos.x,
    dz = g.position.z - pPos.z,
    d = Math.hypot(dx, dz) || 1;
  e.bar.visible = false;
  deathEffects.push({
    g,
    t: 0,
    x: dx / d,
    z: dz / d,
    scale: g.scale.clone(),
    duration: e.kind === "boss" ? 1.4 : 0.42,
  });
  burst(
    g.position.x,
    1,
    g.position.z,
    e.kind === "boss" ? 0xff8a5b : 0xd7e6ff,
    e.kind === "boss" ? 18 : 8,
  );
}
function updateDeathEffects(dt) {
  for (let i = deathEffects.length - 1; i >= 0; i--) {
    const e = deathEffects[i];
    e.t += dt;
    e.g.position.x += e.x * dt * 2.5;
    e.g.position.z += e.z * dt * 2.5;
    e.g.position.y += dt * (2 - e.t * 10);
    e.g.rotation.z += dt * 3;
    e.g.scale.copy(e.scale).multiplyScalar(Math.max(0, 1 - e.t / e.duration));
    if (e.t >= e.duration) {
      disposeObject(e.g);
      deathEffects.splice(i, 1);
    }
  }
}
function resetEffects() {
  resetFeedback();
  for (const p of flyPickups) recyclePickup(p);
  flyPickups = [];
  for (const e of deathEffects) disposeObject(e.g);
  deathEffects.length = 0;
  for (const d of debrisData || []) d.life = 0;
  document.querySelectorAll(".worldPop").forEach((el) => el.remove());
}
