// game system — v12, integrated from the deployed v11.

function update(dt, t) {
  gameElapsed += dt;
  phaseT -= dt;
  if (phase === "day") {
    temp = -10 - (day - 1) * 3;
    fuel = Math.min(100, fuel + dt * 1.6);
    updateResourceRespawn(dt);
    spawnRescueSurvivor();
    updateRescue();
    if (phaseT <= 0) {
      phase = "night";
      phaseT = 999;
      waveLeft = nightEnemyCount(day);
      spawnT = 0;
      const nm = chooseNightModifier();
      sfx(day === 7 ? "boss" : "wave");
      showWaveBanner(
        day === 7 ? "☠️ FINAL NIGHT" : "🌙 NIGHT " + day,
        day === 7 ? "巨大ボス襲来" : nm[0] + " / " + nm[1],
      );
      toast("🌙 第" + day + "夜 — 襲撃開始!");
    }
  } else {
    temp = -25 - (day - 1) * 4;
    fuel -=
      (0.9 + day * 0.12) *
      fireDrainMul *
      (nightModifier === "fuel" ? 1.7 : 1) *
      dt;
    if (waveLeft > 0) {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = Math.max(0.18, 0.5 - day * 0.03);
        spawnEnemyPack();
      }
    }
    if (waveLeft <= 0 && enemies.length === 0 && !upgrading) {
      if (day >= 7) winGame();
      else showUpgrade();
      return;
    }
  }
  updateEnvironment(dt, t);
  updatePlayer(dt, t);
  updateAutoFuel(dt, t);
  ensureBaseGroundTag();
  updateBaseUpgrade(dt);
  updateOutposts(dt);
  updateBuildPads(dt);
  updateDefenseUpgrades(dt);
  updateWorkers(dt, t);
  updateAutoHarvest(dt, t);
  updateEnemies(dt, t);
  updateDefenseCombat(dt, t);
  updateProjectiles(dt, t);
  ghost.visible = false;
  updateObjective();
  if (fuel <= 0 || baseHP <= 0) gameOver(fuel <= 0);
}

function winGame() {
  if (stageClear) return;
  stageClear = true;
  running = false;
  resetInput();
  sfx("base");
  $("goTitle").textContent = "🏆 STAGE CLEAR";
  $("goSub").textContent = "Day 7 巨大襲撃を撃破";
  $("goStat").textContent =
    "確保拠点 " +
    activeOutposts().length +
    " / 5　救助 " +
    rescued +
    "人　撃破 " +
    kills;
  $("gameover").classList.remove("hidden");
}

function showUpgrade() {
  upgrading = true;
  running = false;
  resetInput();
  const pool = [
    {
      icon: "🏹",
      name: "自動射撃強化",
      desc: "自動攻撃ダメージ +20%",
      apply: () => (playerDmg = Math.round(playerDmg * 1.2)),
    },
    {
      icon: "👢",
      name: "雪上ブーツ",
      desc: "移動速度 +12%",
      apply: () => (moveSpeed *= 1.12),
    },
    {
      icon: "🗼",
      name: "矢塔改良",
      desc: "矢塔ダメージ +30%",
      apply: () => (turretDmg = Math.round(turretDmg * 1.3)),
    },
    {
      icon: "🔥",
      name: "断熱炉",
      desc: "夜の燃料消費 -15%",
      apply: () => (fireDrainMul *= 0.85),
    },
    {
      icon: "🧱",
      name: "補給物資",
      desc: "木材 +55 / 石炭 +20",
      apply: () => {
        wood += 55;
        coal += 20;
      },
    },
    {
      icon: "🏰",
      name: "要塞改修",
      desc: "全防衛設備を1段階強化",
      apply: () =>
        defenseState.forEach((st) => {
          if (st.level < MAX_DEF_LV) {
            if (st.type === "warehouse") warehouseBonus += 25;
            st.level++;
            st.maxHp = getDefenseMaxHp(st.type, st.level);
            st.hp = st.maxHp;
          }
        }),
    },
    {
      icon: "❤️",
      name: "拠点補修",
      desc: "拠点耐久を全回復",
      apply: () => (baseHP = baseMax),
    },
  ];
  pool.sort(() => Math.random() - 0.5);
  const picks = pool.slice(0, 3),
    wrap = $("upgradeCards");
  wrap.innerHTML = "";
  picks.forEach((u) => {
    const b = document.createElement("button");
    b.className = "upCard";
    b.innerHTML = `<div style="font-size:30px">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span>`;
    b.onclick = () => {
      u.apply();
      defenseState.forEach((st, k) => {
        const [x, y, z] = k.split(",").map(Number),
          blk = blockAt(x, y, z);
        if (blk) blk.hp = st.hp = st.maxHp = getDefenseMaxHp(st.type, st.level);
        refreshDefenseVisual(x, y, z);
      });
      $("upgrade").classList.add("hidden");
      day++;
      phase = "day";
      phaseT = 20;
      wood += 24 + Math.floor(warehouseBonus * 0.35);
      coal += 10 + Math.floor(warehouseBonus * 0.12);
      resourceRespawnT = 2.5;
      upgrading = false;
      updateCampVisual();
      refreshBaseVisual();
      ensureWorkers();
      running = true;
      updateHUD();
      showWaveBanner("☀️ DAY " + day, "領土を広げて次の夜に備えよう");
      toast("☀️ Day " + day + " — 新しい外部拠点を狙おう");
    };
    wrap.appendChild(b);
  });
  $("upgrade").classList.remove("hidden");
}

function gameOver(froze) {
  if (!running) return;
  running = false;
  resetInput();
  $("goTitle").textContent = froze ? "🧊 焚き火が消えた…" : "☠️ 拠点が陥落…";
  $("goSub").textContent = "生存記録:" + day + "日目";
  $("goStat").textContent =
    "確保拠点 " +
    activeOutposts().length +
    " / 5　救助 " +
    rescued +
    "人　撃破 " +
    kills;
  $("gameover").classList.remove("hidden");
}

function startGame() {
  resetInput();
  resetEffects();
  resetConstruction();
  resetBaseVisual();
  comboT = 0;
  shootCD = 0;
  harvestT = 0;
  shake = 0;
  waveLeft = 0;
  spawnT = 0;
  lastSfx = {};
  temp = -10;
  wood = 90;
  coal = 36;
  iron = 0;
  fuel = 100;
  baseMax = 300;
  baseHP = 300;
  baseLevel = 1;
  baseUpgradeProgress = 0;
  day = 1;
  phase = "day";
  phaseT = 24;
  nightK = 0;
  moveSpeed = 6;
  playerDmg = 16;
  turretDmg = 10;
  fireDrainMul = 1;
  combo = 0;
  kills = 0;
  upgrading = false;
  fuelAutoCD = 0;
  flyPickups = [];
  resourceRespawnT = 6;
  warehouseBonus = 0;
  rescued = 0;
  rescueSpawnedForDay = 0;
  gameElapsed = 0;
  stageClear = false;
  nightModifier = "normal";
  outpostProdT = 0;
  if (rescueNPC) {
    disposeObject(rescueNPC.g);
    rescueNPC = null;
  }
  if (baseLabelEl) {
    baseLabelEl.remove();
    baseLabelEl = null;
  }
  fireGroup.userData = {};
  clearGroundTags();
  baseGroundTag = null;
  enemies.forEach((e) => disposeObject(e.model.g));
  enemies = [];
  arrows.forEach((a) => disposeObject(a.m));
  arrows = [];
  pPos.set(0, 0.5, 4);
  yaw = 0;
  camLook.set(0, 1, 4);
  clearCampExtras();
  buildTerrain();
  buildPlayer();
  addBuildPads();
  initOutposts();
  updateCampVisual();
  refreshBaseVisual();
  ensureBaseGroundTag();
  ensureWorkers();
  running = true;
  ["hud", "phaseBar"].forEach((id) => $(id).classList.remove("hidden"));
  $("combo").style.opacity = 0;
  updateHUD();
  showWaveBanner("☀️ DAY 1", "中央拠点を育てよう");
  toast("移動だけで採集・建築・防衛");
}

// Introductory nights only. Later waves and all enemy statistics are unchanged.
function nightEnemyCount(n) {
  return n === 1 ? 16 : n === 2 ? 24 : n === 7 ? 34 : 14 + n * 7;
}
