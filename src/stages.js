// Campaign progression and presentation. Runs restart at Day1; only completed stages persist.
const STAGES = [
  {
    name: "雪原キャンプ",
    hint: "採集・建築で備え、7日目のボスを撃破",
    sky: 0xbcd8ee,
    outposts: [
      ["sawmill", -19, -10],
      ["coalmine", 19, -9],
      ["ironmine", 0, 21],
      ["survivor", -18, 17],
      ["research", 18, 17],
    ],
  },
  {
    name: "凍結渓谷",
    hint: "西の木材、東の石炭。南北の襲撃に備える",
    sky: 0xb3d4e3,
    outposts: [
      ["sawmill", -20, -14],
      ["coalmine", 20, 14],
      ["ironmine", -19, 18],
      ["survivor", 19, -17],
      ["research", 0, 23],
    ],
  },
  {
    name: "吹雪の前線",
    hint: "南の木材、北の石炭。反対側からの襲撃に注意",
    sky: 0xa8c3d5,
    outposts: [
      ["sawmill", -18, 19],
      ["coalmine", 19, -19],
      ["ironmine", -20, -18],
      ["survivor", 20, 18],
      ["research", 0, -23],
    ],
  },
];
const CAMPAIGN_KEY = "frost-defense.campaign.v1";
let currentStage = 1,
  selectedStage = 1,
  campaign = { version: 1, cleared: 0, records: [] };
let saveMessage = "",
  campaignWritable = true,
  victoryScene = null,
  bossDefeated = false,
  stagePackIndex = 0;
function stageConfig() {
  return STAGES[currentStage - 1];
}
function unlockedStage() {
  return Math.min(STAGES.length, campaign.cleared + 1);
}
function loadCampaignProgress() {
  campaign = { version: 1, cleared: 0, records: [] };
  saveMessage = "";
  campaignWritable = true;
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version !== 1) {
        campaignWritable = false;
        throw new Error("save version");
      }
      if (
        !Number.isInteger(data.cleared) ||
        data.cleared < 0 ||
        data.cleared > STAGES.length
      )
        throw new Error("save range");
      campaign.cleared = data.cleared;
      // Store only bounded, known fields; no saved HTML or arbitrary model state.
      campaign.records = Array.isArray(data.records)
        ? data.records
            .filter(
              (r) =>
                r &&
                Number.isInteger(r.stage) &&
                r.stage >= 1 &&
                r.stage <= data.cleared &&
                ["kills", "rescued", "outposts", "seconds"].every(
                  (k) => Number.isFinite(r[k]) && r[k] >= 0 && r[k] <= 1000000,
                ),
            )
            .slice(0, STAGES.length)
            .map((r) => ({
              stage: r.stage,
              kills: r.kills,
              rescued: r.rescued,
              outposts: Math.min(5, r.outposts),
              seconds: r.seconds,
            }))
        : [];
    }
  } catch (error) {
    saveMessage = "記録を読み込めません。今回はステージ1から開始します。";
  }
  selectedStage = unlockedStage();
}
function saveStageClear() {
  campaign.cleared = Math.max(campaign.cleared, currentStage);
  const record = {
    stage: currentStage,
    kills,
    rescued,
    outposts: activeOutposts().length,
    seconds: Math.round(gameElapsed),
  };
  const old = campaign.records.findIndex((r) => r.stage === currentStage);
  if (old < 0) campaign.records.push(record);
  else campaign.records[old] = record;
  saveMessage = "";
  try {
    if (!campaignWritable) throw new Error("save version");
    window.localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
  } catch (error) {
    saveMessage = "記録を保存できませんでした。この画面から次へ進めます。";
  }
}
function renderStageSelection() {
  const wrap = $("stageSelect");
  wrap.innerHTML = "";
  for (let n = 1; n <= STAGES.length; n++) {
    const b = document.createElement("button");
    b.className = "stageChoice" + (n === selectedStage ? " selected" : "");
    b.disabled = n > unlockedStage();
    b.textContent =
      (b.disabled ? "🔒 " : n <= campaign.cleared ? "✓ " : "") + "STAGE " + n;
    b.setAttribute("aria-pressed", String(n === selectedStage));
    b.onclick = () => {
      selectedStage = n;
      renderStageSelection();
    };
    wrap.appendChild(b);
  }
  $("stageDescription").textContent =
    STAGES[selectedStage - 1].name + " — " + STAGES[selectedStage - 1].hint;
  const record = campaign.records.find((r) => r.stage === selectedStage);
  $("campaignRecord").textContent = record
    ? "前回クリア：確保 " +
      record.outposts +
      "/5 ・ 撃破 " +
      record.kills +
      " ・ 救助 " +
      record.rescued +
      "人"
    : "";
  $("campaignRecord").hidden = !record;
  $("startBtn").textContent = "STAGE " + selectedStage + " 開始";
  $("campaignNote").textContent =
    saveMessage ||
    (campaign.cleared === STAGES.length
      ? "全3ステージ制覇！ 好きなステージに再挑戦できます。"
      : "クリア状況を保存。各ステージはDay1から開始します。");
}
function chooseResultAction() {
  $("gameover").classList.add("hidden");
  if (!stageClear) {
    startGame(currentStage);
    return;
  }
  if (currentStage < STAGES.length) {
    startGame(currentStage + 1);
    return;
  }
  victoryScene = null;
  stageClear = false;
  ["hud", "phaseBar"].forEach((id) => $(id).classList.add("hidden"));
  $("title").classList.remove("hidden");
  selectedStage = unlockedStage();
  renderStageSelection();
}
function stageResourceZone(type, x, z) {
  if (currentStage === 1) return true;
  if (
    stageConfig().outposts.some(
      ([, ox, oz]) => Math.abs(x - ox) < 3 && Math.abs(z - oz) < 3,
    )
  )
    return false;
  if (currentStage === 2) return type === "tree" ? x < -4 : x > 4;
  return type === "tree" ? z > 6 : z < -6;
}
function stageBlockColor(e) {
  if (e.b.t !== "snow" || currentStage === 1) return COLORS[e.b.t];
  if (currentStage === 2 && Math.abs(e.x) < 3 && Math.abs(e.z) > 11)
    return 0x9fbfcf;
  return currentStage === 3 ? 0xdbe8f0 : COLORS.snow;
}
function stageSpawnAngle() {
  if (currentStage === 1) return Math.random() * Math.PI * 2;
  // Stage2 alternates north/south; stage3 pairs a flank with its opposite.
  const sector =
    currentStage === 2
      ? (stagePackIndex % 2) * 2 + 1
      : (Math.floor(stagePackIndex / 2) + (stagePackIndex % 2) * 2 + day) % 4;
  stagePackIndex++;
  return (sector * Math.PI) / 2 + (Math.random() - 0.5) * 0.42;
}
function beginVictoryScene() {
  // Rout survivors without granting combat rewards a second time.
  for (const e of enemies) spawnDeathEffect(e);
  enemies = [];
  arrows.forEach((a) => disposeObject(a.m));
  arrows = [];
  if (actionStrip) actionStrip.visible = false;
  $("combo").style.opacity = 0;
  $("toast").style.opacity = 0;
  $("flash").style.opacity = 0;
  $("waveBanner").classList.remove("show");
  victoryScene = {
    t: 0,
    from: camera.position.clone(),
    look: camLook.clone(),
    night: nightK,
    snow: snowPts.material.opacity,
  };
  $("phaseCaption").textContent = "防衛成功";
  $("phaseFill").style.width = "100%";
}
function updateVictoryScene(dt) {
  if (!victoryScene) return;
  const v = victoryScene;
  v.t += dt;
  const q = Math.min(1, v.t / 2.2),
    ease = q * q * (3 - 2 * q);
  nightK = v.night * (1 - ease);
  scene.background
    .set(stageConfig().sky)
    .lerp(new THREE.Color(0x0a1226), nightK);
  scene.fog.color.copy(scene.background);
  sun.intensity = 1.15 - nightK * 0.95;
  hemi.intensity = 0.9 - nightK * 0.55;
  snowPts.material.opacity = v.snow * (1 - ease * 0.8);
  camera.position.lerpVectors(v.from, new THREE.Vector3(13, 18, 22), ease);
  camera.lookAt(v.look.x * (1 - ease), 1, v.look.z * (1 - ease));
  updateParticles(dt);
  if (q >= 1) {
    victoryScene = null;
    $("goTitle").textContent = "🏆 STAGE " + currentStage + " CLEAR";
    $("goSub").textContent =
      currentStage === STAGES.length
        ? "全3ステージ制覇！"
        : stageConfig().name + " 防衛成功";
    $("goStat").textContent =
      "確保拠点 " +
      activeOutposts().length +
      " / 5　救助 " +
      rescued +
      "人　撃破 " +
      kills;
    $("resultSaveNote").textContent = saveMessage;
    $("retryBtn").textContent =
      currentStage < STAGES.length
        ? "STAGE " + (currentStage + 1) + " へ"
        : "ステージ選択へ";
    $("gameover").classList.remove("hidden");
    sfx("upgrade");
  }
}
