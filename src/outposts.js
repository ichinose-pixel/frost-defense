// outposts system — v12, integrated from the deployed v11.

function outpostInfo(type) {
  return type === "sawmill"
    ? { name: "製材所", icon: "🪵", color: 0xffc66e, need: 2, prod: "🌲 +6" }
    : type === "coalmine"
      ? { name: "炭鉱", icon: "⛏️", color: 0xaec8ea, need: 2, prod: "🪨 +4" }
      : type === "ironmine"
        ? {
            name: "鉄鉱山",
            icon: "⚙️",
            color: 0xcfd8e2,
            need: 3,
            prod: "⚙️ +2",
          }
        : type === "survivor"
          ? {
              name: "生存者キャンプ",
              icon: "🧑",
              color: 0x9de3a0,
              need: 2,
              prod: "住民 +1",
            }
          : {
              name: "研究所跡地",
              icon: "🔬",
              color: 0x9ed7ff,
              need: 4,
              prod: "全塔 +10%",
            };
}

function makeOutpostVisual(type, x, z) {
  const g = new THREE.Group(),
    floor = box(3, 0.12, 3, 0x6e7e8e);
  floor.position.y = 0.58;
  g.add(floor);
  if (type === "sawmill")
    addVoxelDetails(g, [
      [2.3, 0.65, 1.2, 0x8f6339, 0, 1, 0],
      [2.55, 0.18, 1.45, 0x594438, 0, 1.48, 0],
      [0.28, 1.05, 0.28, 0xd4ad6d, -0.95, 1.2, 0.55],
      [0.28, 1.05, 0.28, 0xd4ad6d, 0.95, 1.2, 0.55],
      [1.6, 0.18, 0.18, 0xc98b4e, 0, 0.78, -0.85],
    ]);
  else if (type === "coalmine" || type === "ironmine")
    addVoxelDetails(g, [
      [2.2, 1.55, 0.5, 0x545f6c, 0, 1.25, 0],
      [0.4, 1.3, 0.4, 0x9ca9b5, -0.88, 1.35, 0],
      [0.4, 1.3, 0.4, 0x9ca9b5, 0.88, 1.35, 0],
      [
        1.65,
        0.25,
        0.25,
        type === "ironmine" ? 0xc9d2da : 0x303843,
        0,
        0.85,
        0.55,
      ],
      [
        0.4,
        0.4,
        0.4,
        type === "ironmine" ? 0xd9e2e9 : 0x252b32,
        -0.55,
        0.85,
        -0.65,
      ],
      [
        0.4,
        0.4,
        0.4,
        type === "ironmine" ? 0xaab6c0 : 0x3a414b,
        0.2,
        0.85,
        -0.7,
      ],
    ]);
  else if (type === "survivor")
    addVoxelDetails(g, [
      [2.2, 0.65, 1.5, 0xb66e48, 0, 1, 0],
      [2.45, 0.18, 1.7, 0xe1b36b, 0, 1.47, 0],
      [0.25, 0.7, 0.25, 0xffd36b, 0.8, 1.2, 0.65],
      [0.7, 0.12, 0.08, 0xfff0a0, 0.8, 1.62, 0.65],
    ]);
  else
    addVoxelDetails(g, [
      [2, 1.3, 1.8, 0x687b8f, 0, 1.3, 0],
      [2.3, 0.22, 2.05, 0x3c5268, 0, 2.03, 0],
      [0.35, 0.75, 0.35, 0x9ed7ff, -0.55, 2.35, 0],
      [0.35, 0.75, 0.35, 0x9ed7ff, 0.55, 2.35, 0],
    ]);
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

function initOutposts() {
  outposts.forEach((o) => {
    disposeObject(o.g);
  });
  outposts = [];
  [
    ["sawmill", -19, -10],
    ["coalmine", 19, -9],
    ["ironmine", 0, 21],
    ["survivor", -18, 17],
    ["research", 18, 17],
  ].forEach(([type, x, z]) => {
    const i = outpostInfo(type),
      g = makeOutpostVisual(type, x, z),
      tag = makeGroundTag(
        i.icon + " " + i.name,
        "🔒 拠点Lv." + i.need,
        "#8ea6bd",
        3.25,
        0.88,
      );
    tag.position.set(x, 0.56, z + 2.15);
    outposts.push({
      type,
      x,
      z,
      g,
      tag,
      captured: false,
      hp: 240,
      maxHp: 240,
      progress: 0,
      prodT: 0,
    });
  });
}

function refreshOutpostTag(o) {
  const i = outpostInfo(o.type);
  if (o.captured)
    setGroundTag(
      o.tag,
      i.icon + " " + i.name + " ✓",
      i.prod + " / HP " + Math.max(0, o.hp | 0),
      "#86f0b1",
    );
  else if (baseLevel < i.need)
    setGroundTag(
      o.tag,
      i.icon + " " + i.name,
      "🔒 拠点Lv." + i.need,
      "#8ea6bd",
    );
  else
    setGroundTag(o.tag, i.icon + " " + i.name, "確保 / " + i.prod, "#ffd36b");
}

function updateOutposts(dt) {
  for (const o of outposts) {
    refreshOutpostTag(o);
    if (phase !== "day") continue;
    const d = Math.hypot(o.x - pPos.x, o.z - pPos.z);
    if (!o.captured && baseLevel >= outpostInfo(o.type).need && d < 2.4) {
      o.progress += dt;
      if (o.progress > 0.7) {
        o.progress = 0;
        o.captured = true;
        o.hp = o.maxHp;
        sfx("capture");
        showWaveBanner("AREA SECURED", outpostInfo(o.type).name + " を確保");
        if (!o.rewardClaimed && o.type === "survivor") {
          rescued++;
          makeWorker(workerObjs.length);
        }
        if (!o.rewardClaimed && o.type === "research") {
          turretDmg = Math.round(turretDmg * 1.1);
          playerDmg = Math.round(playerDmg * 1.08);
        }
        o.rewardClaimed = true;
      }
    } else if (!o.captured) o.progress = 0;
    if (o.captured) {
      o.prodT -= dt;
      if (o.prodT <= 0) {
        o.prodT = 4.2;
        if (o.type === "sawmill") {
          wood += 6;
          sfx("wood");
        } else if (o.type === "coalmine") {
          coal += 4;
          sfx("coal");
        } else if (o.type === "ironmine") {
          iron += 2;
          sfx("iron");
        }
        updateHUD();
      }
    }
  }
}

function activeOutposts() {
  return outposts.filter((o) => o.captured && o.hp > 0);
}

function damageOutpost(o, dmg) {
  o.hp -= dmg;
  if (o.hp <= 0) {
    o.hp = 0;
    o.captured = false;
    o.progress = 0;
    showWaveBanner("OUTPOST LOST", outpostInfo(o.type).name + " が陥落");
  }
}

function chooseNightModifier() {
  const pool =
    day <= 2
      ? ["normal", "wolf"]
      : ["blizzard", "wolf", "fuel", "armored", "siege"];
  if (day === 6) pool.push("bossOmen");
  nightModifier = pool[Math.floor(Math.random() * pool.length)];
  const map = {
    normal: ["静かな夜", "通常襲撃"],
    blizzard: ["猛吹雪", "見張り台射程 -25%"],
    wolf: ["狼の夜", "高速の狼が大量出現"],
    fuel: ["燃料危機", "燃料消費 +70%"],
    armored: ["重装襲来", "高耐久兵が増加"],
    siege: ["破城の夜", "防壁狙いが増加"],
    bossOmen: ["巨大な足跡", "次夜にボス襲来"],
  };
  return map[nightModifier];
}
