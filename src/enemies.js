// enemies system — v12, integrated from the deployed v11.

function makeWolf() {
  const g = new THREE.Group(),
    c = 0x8996aa,
    body = box(0.82, 0.38, 0.38, c);
  body.position.y = 0.56;
  g.add(body);
  const head = box(0.34, 0.34, 0.34, c);
  head.position.set(0.5, 0.72, 0);
  g.add(head);
  addVoxelDetails(g, [
    [0.18, 0.16, 0.18, 0xaab5c4, 0.5, 0.92, 0],
    [0.08, 0.08, 0.05, 0xffb04a, 0.69, 0.76, 0.18],
    [0.08, 0.08, 0.05, 0xffb04a, 0.69, 0.76, -0.18],
    [0.18, 0.13, 0.2, 0x657185, 0.72, 0.64, 0],
  ]);
  const legs = [];
  [
    [-0.28, -0.13],
    [-0.28, 0.13],
    [0.26, -0.13],
    [0.26, 0.13],
  ].forEach(([px, pz]) => {
    const l = box(0.11, 0.38, 0.11, 0x657185);
    l.geometry.translate(0, -0.19, 0);
    l.position.set(px, 0.38, pz);
    g.add(l);
    legs.push(l);
  });
  const tail = box(0.38, 0.11, 0.11, 0x9ba8ba);
  tail.position.set(-0.55, 0.68, 0);
  tail.rotation.z = 0.4;
  g.add(tail);
  return { g, legs };
}

function makeRaider(scale = 1) {
  const g = new THREE.Group(),
    coat = scale > 1 ? 0x7a2c2c : 0x454b58,
    body = box(0.5, 0.58, 0.32, coat);
  body.position.y = 1;
  g.add(body);
  addVoxelDetails(g, [
    [0.46, 0.1, 0.35, 0x242a34, 0, 0.82, 0],
    [0.12, 0.12, 0.08, 0x758096, -0.16, 1.12, 0.2],
    [0.12, 0.12, 0.08, 0x758096, 0.16, 1.12, 0.2],
  ]);
  const head = box(0.36, 0.36, 0.36, 0xd8b088);
  head.position.y = 1.48;
  g.add(head);
  addVoxelDetails(g, [
    [0.42, 0.13, 0.42, 0x2d3440, 0, 1.68, 0],
    [0.08, 0.06, 0.03, 0x15191f, -0.1, 1.51, 0.2],
    [0.08, 0.06, 0.03, 0x15191f, 0.1, 1.51, 0.2],
  ]);
  const legs = [];
  [
    [-0.13, 0],
    [0.13, 0],
  ].forEach(([px, pz]) => {
    const l = box(0.17, 0.54, 0.17, 0x292f3a);
    l.geometry.translate(0, -0.27, 0);
    l.position.set(px, 0.54, pz);
    g.add(l);
    legs.push(l);
  });
  const arms = [];
  [
    [-0.34, 0],
    [0.34, 0],
  ].forEach(([px, pz]) => {
    const a = box(0.15, 0.54, 0.15, coat);
    a.geometry.translate(0, -0.25, 0);
    a.position.set(px, 1.23, pz);
    g.add(a);
    arms.push(a);
  });
  g.scale.setScalar(scale);
  return { g, legs, arms };
}

function colorizeEnemy(g, kind) {
  const col =
    kind === "armored"
      ? 0x697989
      : kind === "breaker"
        ? 0x8a4d37
        : kind === "thrower"
          ? 0x6d597f
          : kind === "boss"
            ? 0x8f3030
            : null;
  if (!col) return;
  g.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.color.lerp(new THREE.Color(col), 0.45);
    }
  });
}

function chooseEnemyKind() {
  if (day === 7 && waveLeft <= 1) return "boss";
  const r = Math.random();
  if (currentStage >= 2 && day >= 3 && r > 0.82)
    return currentStage === 3 && r > 0.91 ? "breaker" : "armored";
  if (nightModifier === "wolf" && r < 0.78) return "wolf";
  if (nightModifier === "armored" && r < 0.58) return "armored";
  if (nightModifier === "siege" && r < 0.58) return "breaker";
  if (day >= 4 && r < 0.16) return "thrower";
  if (day >= 3 && r < 0.34) return "armored";
  if (day >= 3 && r < 0.49) return "breaker";
  return r < 0.72 ? "wolf" : "raider";
}

function spawnEnemy(x = null, z = null, kindOverride = null) {
  const a = Math.random() * Math.PI * 2,
    r = R_INNER - 1.2;
  if (x === null || z === null) {
    x = Math.round(Math.cos(a) * r);
    z = Math.round(Math.sin(a) * r);
  }
  const kind = kindOverride || chooseEnemyKind(),
    scale =
      kind === "boss"
        ? 1.75
        : kind === "armored"
          ? 1.2
          : kind === "breaker"
            ? 1.15
            : 1,
    model = kind === "wolf" ? makeWolf() : makeRaider(scale);
  colorizeEnemy(model.g, kind);
  const hpBase =
      {
        wolf: 26,
        raider: 48,
        armored: 105,
        breaker: 78,
        thrower: 54,
        boss: 620,
      }[kind] || 48,
    hp = hpBase + day * (kind === "boss" ? 35 : 7);
  model.g.position.set(x, 0.5, z);
  const bb = box(kind === "boss" ? 1.25 : 0.8, 0.1, 0.05, 0x222222);
  bb.position.y = kind === "boss" ? 3.4 : 2.1;
  model.g.add(bb);
  const bf = box(
    kind === "boss" ? 1.25 : 0.8,
    0.12,
    0.06,
    kind === "boss" ? 0xffa23a : 0xff4444,
  );
  bf.position.y = bb.position.y;
  model.g.add(bf);
  scene.add(model.g);
  const sp = {
      wolf: 3.45,
      raider: 2.05,
      armored: 1.25,
      breaker: 1.7,
      thrower: 1.6,
      boss: 1.15,
    }[kind],
    dmg = {
      wolf: 7,
      raider: 11,
      armored: 15,
      breaker: 28,
      thrower: 12,
      boss: 38,
    }[kind],
    ops = activeOutposts(),
    targetOutpost =
      kind !== "boss" &&
      ops.length &&
      Math.random() < (currentStage === 3 ? 0.52 : 0.42)
        ? ops[Math.floor(Math.random() * ops.length)]
        : null;
  enemies.push({
    kind,
    model,
    hp,
    max: hp,
    sp,
    dmg,
    atkT: 0,
    bar: bf,
    walkT: Math.random() * 6,
    targetOutpost,
  });
}

function spawnEnemyPack() {
  if (waveLeft <= 0) return;
  const a = stageSpawnAngle(),
    r = R_INNER - 1.2,
    baseX = Math.round(Math.cos(a) * r),
    baseZ = Math.round(Math.sin(a) * r),
    pack =
      day === 7 && waveLeft <= 1
        ? 1
        : Math.min(5, 2 + Math.floor(day / 2) + (Math.random() < 0.6 ? 1 : 0));
  for (let i = 0; i < pack && waveLeft > 0; i++) {
    const ox = (Math.random() * 2 - 1) * 1.5,
      oz = (Math.random() * 2 - 1) * 1.5;
    spawnEnemy(Math.round(baseX + ox), Math.round(baseZ + oz), null);
    waveLeft--;
  }
}

function shootArrow(from, dir, dmg, home) {
  const m = box(0.07, 0.07, 0.55, 0xffe08a);
  m.position.copy(from);
  m.lookAt(from.clone().add(dir));
  scene.add(m);
  arrows.push({
    m,
    v: dir.clone().multiplyScalar(26),
    dmg,
    life: 2,
    home: home || null,
  });
}

function updateEnemies(dt, t) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i],
      g = e.model.g;
    if (e.hp <= 0) {
      if (e.kind === "boss") bossDefeated = true;
      burst(g.position.x, 1, g.position.z, 0xff5544, 12);
      spawnDeathEffect(e);
      enemies.splice(i, 1);
      wood += 4;
      coal += 2;
      kills++;
      combo++;
      comboT = 2.2;
      if (combo >= 2) {
        $("comboN").textContent = combo;
        $("combo").style.opacity = 1;
      }
      sfx("kill");
      worldPop(
        combo >= 3 ? combo + " COMBO!" : "撃破!",
        g.position.clone().add(new THREE.Vector3(0, 1.7, 0)),
        combo >= 3 ? "#ffe08a" : "#fff",
      );
      toast(combo >= 3 ? "🔥 " + combo + " COMBO!" : "撃破! +4🌲 +2🪨");
      updateHUD();
      continue;
    }
    e.walkT += dt * e.sp * 3;
    if (
      e.targetOutpost &&
      (!e.targetOutpost.captured || e.targetOutpost.hp <= 0)
    )
      e.targetOutpost = null;
    let tx = 0,
      tz = 0;
    if (e.targetOutpost) {
      tx = e.targetOutpost.x;
      tz = e.targetOutpost.z;
    }
    if (e.kind === "breaker" && !e.targetOutpost) {
      let bd = 1e9;
      defenseState.forEach((st, k) => {
        if (st.type !== "wall") return;
        const [wx, wy, wz] = k.split(",").map(Number),
          dd = Math.hypot(wx - g.position.x, wz - g.position.z);
        if (dd < bd) {
          bd = dd;
          tx = wx;
          tz = wz;
        }
      });
    }
    const dx = tx - g.position.x,
      dz = tz - g.position.z,
      d = Math.hypot(dx, dz);
    g.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    e.model.legs.forEach(
      (l, li) => (l.rotation.x = Math.sin(e.walkT + li * Math.PI) * 0.6),
    );
    if (
      d < 1.8 &&
      !(e.kind === "breaker" && !e.targetOutpost && (tx !== 0 || tz !== 0))
    ) {
      e.atkT -= dt;
      if (e.atkT <= 0) {
        e.atkT = 0.9;
        if (e.targetOutpost) {
          damageOutpost(e.targetOutpost, e.dmg);
          burst(e.targetOutpost.x, 1, e.targetOutpost.z, 0xff7733, 6);
        } else {
          baseHP -= e.dmg;
          fuel = Math.max(0, fuel - e.dmg * 0.3);
          burst(0, 1, 0, 0xff7733, 8);
          shake = 3;
          flash();
        }
        updateHUD();
      }
    } else {
      const nx2 = g.position.x + (dx / (d || 1)) * e.sp * dt,
        nz2 = g.position.z + (dz / (d || 1)) * e.sp * dt,
        s = solidAt(nx2, nz2);
      if (s) {
        e.atkT -= dt;
        if (e.atkT <= 0) {
          e.atkT = 0.9;
          s.hp -= e.dmg;
          const bk = [...blocks.entries()].find(([k, v]) => v === s);
          if (bk) {
            const [bx, by, bz] = bk[0].split(",").map(Number),
              st = defenseState.get(bk[0]);
            if (st) st.hp = s.hp;
            burst(bx, by + 0.5, bz, 0xc49a63, 4);
            if (s.hp <= 0) {
              removeBlock(bx, by, bz);
              burst(bx, by + 0.5, bz, 0x888888, 14);
              toast("🧱 防衛オブジェクトが破壊された!");
            }
          }
        }
      } else {
        g.position.x = nx2;
        g.position.z = nz2;
      }
    }
    e.bar.scale.x = Math.max(0.01, e.hp / e.max);
  }
}

function updateProjectiles(dt, t) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.life -= dt;
    if (a.home && a.home.hp > 0) {
      const dir = a.home.model.g.position
        .clone()
        .add(new THREE.Vector3(0, 0.8, 0))
        .sub(a.m.position)
        .normalize();
      a.v.lerp(dir.multiplyScalar(30), 0.25);
    }
    a.v.y -= (a.home ? 0 : 4) * dt;
    a.m.position.add(a.v.clone().multiplyScalar(dt));
    a.m.lookAt(a.m.position.clone().add(a.v));
    let dead = a.life <= 0 || a.m.position.y < 0;
    if (!dead)
      for (const e of enemies)
        if (
          a.m.position.distanceTo(
            e.model.g.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
          ) < 0.8
        ) {
          e.hp -= a.dmg;
          burst(a.m.position.x, a.m.position.y, a.m.position.z, 0xffe08a, 3);
          dead = true;
          break;
        }
    if (!dead && a.m.position.y < 4) {
      const c = blockAt(
        Math.round(a.m.position.x),
        Math.round(a.m.position.y),
        Math.round(a.m.position.z),
      );
      if (
        c ||
        (a.m.position.y >= 0.5 &&
          a.m.position.y < 1.5 &&
          solidAt(a.m.position.x, a.m.position.z))
      )
        dead = true;
    }
    if (dead) {
      disposeObject(a.m);
      arrows.splice(i, 1);
    }
  }
}
