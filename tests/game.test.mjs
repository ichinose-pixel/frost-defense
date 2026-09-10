import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as THREE from "three";

// Real Three.js scene/geometry/math. Only DOM, timers and GPU IO are stubbed.
// These tests do NOT claim to test WebGL rasterization or iPhone compositing.
function harness(initialize = true) {
  const elements = new Map(),
    listeners = new Map();
  function element(id = "") {
    const classes = new Set();
    return {
      id,
      style: { setProperty() {} },
      children: [],
      hidden: false,
      disabled: false,
      textContent: "",
      innerHTML: "",
      offsetWidth: 105,
      offsetHeight: 36,
      classList: {
        add(c) {
          classes.add(c);
        },
        remove(c) {
          classes.delete(c);
        },
        contains(c) {
          return classes.has(c);
        },
      },
      appendChild(e) {
        this.children.push(e);
        e.parent = this;
      },
      remove() {
        if (this.parent)
          this.parent.children = this.parent.children.filter((x) => x !== this);
      },
      setAttribute() {},
      addEventListener(type, fn) {
        this[type] = fn;
      },
      getBoundingClientRect() {
        return {
          left: 0,
          right: 390,
          top: 0,
          bottom: id === "hud" ? 100 : 844,
          width: 390,
          height: id === "hud" ? 100 : 844,
        };
      },
      setPointerCapture() {},
      hasPointerCapture() {
        return false;
      },
      releasePointerCapture() {},
    };
  }
  const document = {
    hidden: false,
    body: element("body"),
    documentElement: { clientWidth: 390, style: { setProperty() {} } },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, element(id));
      return elements.get(id);
    },
    createElement() {
      return element();
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
  };
  class Renderer {
    constructor() {
      this.domElement = element("canvas");
    }
    setSize() {}
    setPixelRatio() {}
    setClearAlpha() {}
    render() {}
  }
  const math = Object.create(Math);
  let seed = 17;
  math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const context = vm.createContext({
    THREE: { ...THREE, WebGLRenderer: Renderer },
    document,
    window: { visualViewport: { height: 844, addEventListener() {} } },
    innerWidth: 390,
    innerHeight: 844,
    devicePixelRatio: 3,
    console,
    performance: { now: () => 1000 },
    Math: math,
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame() {},
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
  });
  const names = [
    "state",
    "world",
    "audio",
    "effects",
    "base",
    "outposts",
    "buildings",
    "player",
    "enemies",
    "resources",
    "ui",
    "ground-ui",
    "construction",
    "input",
    "game",
  ];
  vm.runInContext(
    names
      .map((n) =>
        readFileSync(new URL("../src/" + n + ".js", import.meta.url), "utf8"),
      )
      .join("\n"),
    context,
  );
  const run = (code) => vm.runInContext(code, context);
  if (initialize) run("initScene();startGame();flushWorld();");
  return { run, elements, listeners };
}

test("v13 introductory wave count, baseline stats and Day7 victory", () => {
  const { run } = harness();
  assert.equal(run("wood"), 90);
  assert.equal(run("coal"), 36);
  assert.equal(run("phaseT"), 24);
  assert.equal(run("moveSpeed"), 6);
  assert.equal(run("getDefenseMaxHp('wall',1)"), 220);
  assert.equal(run("getDefenseMaxHp('wall',3)"), 506);
  run("phaseT=0;update(.01,0)");
  assert.equal(run("phase"), "night");
  assert.equal(run("waveLeft"), 16);
  run("day=7;waveLeft=1;spawnEnemyPack()");
  assert.equal(run("enemies.at(-1).kind"), "boss");
  assert.equal(run("enemies.at(-1).max"), 865);
  run("enemies=[];waveLeft=0;update(.01,1)");
  assert.equal(run("stageClear"), true);
  assert.equal(run("running"), false);
});
test("locked buildings and insufficient resources never charge", () => {
  const { run } = harness();
  run("const pad=buildPads.find(p=>p.type==='flame');wood=100;coal=100");
  assert.equal(run("buildFromPad(pad)"), false);
  assert.equal(run("wood"), 100);
  run("baseLevel=2;coal=17");
  assert.equal(run("buildFromPad(pad)"), false);
  assert.equal(run("wood"), 100);
  run("coal=18");
  assert.equal(run("buildFromPad(pad)"), true);
  assert.equal(run("wood"), 45);
  assert.equal(run("coal"), 0);
  assert.equal(run("buildFromPad(pad)"), false);
});
test("wall construction waits for full footprint, never moves player, then rebuilds same pad", () => {
  const { run } = harness();
  run(
    "const pad=buildPads.find(p=>p.x===0&&p.z===6);buildPads=[pad];pPos.set(1.5,.5,6);buildFromPad(pad);for(let i=0;i<30;i++)updateBuildPads(.05)",
  );
  assert.equal(run("pad.built"), false);
  assert.equal(run("pPos.x"), 1.5);
  assert.equal(run("pPos.z"), 6);
  assert.equal(run("wood"), 75);
  run("pPos.z=8;updateBuildPads(.05)");
  assert.equal(run("pad.built"), true);
  assert.equal(run("constructionSites.length"), 0);
  run("removeBlock(0,1,6)");
  assert.equal(run("pad.built"), false);
  assert.equal(run("pad.rebuilding"), true);
  assert.equal(run("pad.g.visible"), true);
  assert.equal(run("buildFromPad(pad)"), true);
  run("updateBuildPads(1)");
  assert.equal(run("pad.built"), true);
  assert.equal(run("wood"), 60);
});
test("retry clears construction, input, pickups, base models and does not accumulate labels", () => {
  const { run } = harness();
  run(
    "wood=999;coal=999;upgradeBase();buildFromPad(buildPads[0]);keys.KeyW=true;joyVec.x=1;spawnPickupTrail(1,1,1,0xe3ba79,8,player.position);const old=constructionSites[0].g;startGame()",
  );
  assert.equal(run("constructionSites.length"), 0);
  assert.equal(run("old.parent"), null);
  assert.equal(run("flyPickups.length"), 0);
  assert.equal(run("joyVec.x"), 0);
  assert.equal(run("Object.keys(keys).length"), 0);
  assert.equal(run("fireGroup.userData.ring2"), undefined);
  assert.equal(run("groundTagMeshes.length"), 24);
  run("startGame();startGame()");
  assert.equal(run("groundTagMeshes.length"), 24);
  assert.equal(run("$('groundLabels').children.length"), 24);
});
test("warehouse bonus is removed on destruction and not multiplied by rebuilding", () => {
  const { run } = harness();
  run(
    "baseLevel=3;wood=999;coal=999;const pad=buildPads.find(p=>p.type==='warehouse');buildFromPad(pad);updateBuildPads(1)",
  );
  assert.equal(run("warehouseBonus"), 40);
  run("removeBlock(pad.x,1,pad.z)");
  assert.equal(run("warehouseBonus"), 0);
  run("buildFromPad(pad);updateBuildPads(1)");
  assert.equal(run("warehouseBonus"), 40);
});
test("resource pickup pool is bounded, reuses meshes, follows moving player", () => {
  const { run } = harness();
  run(
    "spawnPickupTrail(0,1,0,0xe3ba79,200,player.position);const mesh=flyPickups[0].mesh;player.position.x=4;updatePickups(.01)",
  );
  assert.equal(run("flyPickups.length"), 128);
  assert.equal(run("flyPickups[0].target.x"), 4);
  run("updatePickups(2)");
  assert.equal(run("flyPickups.length"), 0);
  assert.equal(run("pickupPool.length"), 128);
  run("spawnPickupTrail(0,1,0,0xe3ba79,128,player.position)");
  assert.equal(run("flyPickups.some(p=>p.mesh===mesh)"), true);
});
test("research and survivor capture bonuses are not repeatable rewards", () => {
  const { run } = harness();
  run(
    "baseLevel=4;const o=outposts.find(o=>o.type==='research');pPos.set(o.x,.5,o.z);updateOutposts(.8);const damage=playerDmg;damageOutpost(o,999);updateOutposts(.8)",
  );
  assert.equal(run("playerDmg"), run("damage"));
});
test("breaker attacks wall rather than remote base", () => {
  const { run } = harness();
  run(
    "const pad=buildPads.find(p=>p.x===0&&p.z===6);buildFromPad(pad);updateBuildPads(1);phase='night';waveLeft=0;spawnEnemy(0,7.4,'breaker');enemies[0].sp=0;enemies[0].atkT=0;shootCD=10;update(.01,1)",
  );
  assert.equal(run("baseHP"), 300);
  run("enemies[0].model.g.position.z=6.4;enemies[0].atkT=0;update(.01,2)");
  assert.equal(run("baseHP"), 300);
  assert.equal(run("blockAt(0,1,6).hp"), 192);
});
test("ground costs mark only missing resources and rings are above snow", () => {
  const { run } = harness();
  run("wood=5;coal=30;iron=0");
  assert.match(run("costText({wood:10,coal:20})"), /class="missing">🌲10/);
  assert.doesNotMatch(
    run("costText({wood:10,coal:20})"),
    /class="missing">🪨20/,
  );
  assert.equal(run("groundTagMeshes.every(g=>g.position.y>.5)"), true);
});
test("longer normal simulation and particles do not throw or exceed instance capacity", () => {
  const { run } = harness();
  run(
    "for(let i=0;i<1800&&running;i++){update(1/60,i/60);updateParticles(1/60);flushWorld();if(i%6===0)updateWorldLabels()}",
  );
  assert.equal(run("Number.isFinite(baseHP)&&Number.isFinite(fuel)"), true);
  assert.equal(run("inst.count<=inst.instanceMatrix.count"), true);
});

test("complete startup wires start button and context recovery; GPU failure is visible", () => {
  const source = readFileSync(
    new URL("../src/bootstrap.js", import.meta.url),
    "utf8",
  );
  const good = harness(false);
  good.run(source);
  assert.equal(good.run("typeof $('startBtn').click"), "function");
  good.run("$('startBtn').click()");
  assert.equal(good.run("running"), true);
  good.run("renderer.domElement.webglcontextlost({preventDefault(){}})");
  assert.equal(good.run("contextLost"), true);
  assert.equal(good.run("$('runtimeStatus').hidden"), false);
  good.run("renderer.domElement.webglcontextrestored()");
  assert.equal(good.run("contextLost"), false);
  const bad = harness(false);
  bad.run(
    'THREE.WebGLRenderer=class {constructor(){throw new Error("GPU unavailable")}};console={...console,error(){}}',
  );
  bad.run(source);
  assert.equal(bad.run("$('startBtn').disabled"), true);
  assert.equal(bad.run("$('startupError').hidden"), false);
});
test("pointer ownership, cancel and blur stop movement", () => {
  const { run, listeners } = harness();
  run(
    "bindInput();renderer.domElement.pointerdown({pointerId:1,button:0,clientX:120,clientY:500,preventDefault(){}})",
  );
  assert.equal(run("joyId"), 1);
  run(
    "renderer.domElement.pointerdown({pointerId:2,button:0,clientX:220,clientY:600,preventDefault(){}})",
  );
  assert.equal(run("joyId"), 1);
  listeners.get("pointermove")({ pointerId: 1, clientX: 168, clientY: 500 });
  assert.equal(run("joyVec.x"), 1);
  listeners.get("pointercancel")({ pointerId: 1 });
  assert.equal(run("joyVec.x"), 0);
  assert.equal(run("joyId"), null);
  run("keys.KeyW=true;joyVec.y=1");
  listeners.get("blur")();
  assert.equal(run("joyVec.y"), 0);
  assert.equal(run("Object.keys(keys).length"), 0);
});

test("walking across plots never builds; stopping selects one and waits 0.8 seconds", () => {
  const { run } = harness();
  run(
    "const pad=buildPads.find(p=>p.x===0&&p.z===6);keys.KeyD=true;for(let i=0;i<60;i++){pPos.set(-3+i*.1,.5,6);updateBuildPads(.05)}",
  );
  assert.equal(run("constructionSites.length"), 0);
  assert.equal(run("wood"), 90);
  run(
    "delete keys.KeyD;pPos.set(0,.5,5);for(let i=0;i<14;i++)updateBuildPads(.05)",
  );
  assert.equal(run("pad.constructing"), undefined);
  assert.equal(run("wood"), 90);
  run("updateBuildPads(.11)");
  assert.equal(run("pad.constructing"), true);
  assert.equal(run("wood"), 75);
  assert.equal(run("constructionSites.length"), 1);
  run("for(let i=0;i<60;i++){updateBuildPads(.05);updateDefenseUpgrades(.05)}");
  assert.equal(run("pad.built"), true);
  assert.equal(run("defenseState.get(key(0,1,6)).level"), 1);
  assert.equal(run("wood"), 75);
  run(
    "keys.KeyW=true;updateBuildPads(.01);delete keys.KeyW;for(let i=0;i<17;i++)updateDefenseUpgrades(.05)",
  );
  assert.equal(run("defenseState.get(key(0,1,6)).level"), 2);
});
test("moving away resets partial build dwell rather than accumulating passes", () => {
  const { run } = harness();
  run(
    "pPos.set(0,.5,5);updateBuildPads(.5);pPos.z=3;updateBuildPads(.1);pPos.z=5;updateBuildPads(.5)",
  );
  assert.equal(run("constructionSites.length"), 0);
  assert.equal(run("wood"), 90);
});
test("footprints, outlines, enemy collision and player collision agree at edges", () => {
  const { run } = harness();
  assert.equal(
    run("JSON.stringify(defenseFootprint('wall',0,6))"),
    '{"width":4,"depth":1}',
  );
  assert.equal(
    run("JSON.stringify(defenseFootprint('turret',8,8))"),
    '{"width":2,"depth":2}',
  );
  run(
    "const p=buildPads.find(p=>p.type==='turret');buildFromPad(p);updateBuildPads(1)",
  );
  assert.equal(run("!!solidAt(p.x+.9,p.z+.9)"), true);
  assert.equal(run("!!solidAt(p.x+1.1,p.z)"), false);
  assert.equal(run("playerCollidesAt(p.x+1.2,p.z)"), true);
  assert.equal(
    run("buildPads.every(p=>p.tag.position.x===p.x&&p.tag.position.z===p.z)"),
    true,
  );
  run("p.tag.userData.ring.geometry.computeBoundingBox()");
  assert.equal(
    run(
      "p.tag.userData.ring.geometry.boundingBox.max.x-p.tag.userData.ring.geometry.boundingBox.min.x",
    ),
    2,
  );
});
test("enlarged plots do not overlap and leave walkable north/south and side exits", () => {
  const { run } = harness();
  assert.equal(
    run(
      `buildPads.every((p,i)=>buildPads.slice(i+1).every(q=>{const a=defenseFootprint(p.type,p.x,p.z),b=defenseFootprint(q.type,q.x,q.z);return Math.abs(p.x-q.x)>=(a.width+b.width)/2||Math.abs(p.z-q.z)>=(a.depth+b.depth)/2}))`,
    ),
    true,
  );
  run(
    "baseLevel=4;wood=9999;coal=9999;pPos.set(0,.5,0);for(const p of buildPads)buildFromPad(p);updateBuildPads(1)",
  );
  assert.equal(run("playerCollidesAt(2.5,6)"), false);
  assert.equal(run("playerCollidesAt(-2.5,-6)"), false);
  assert.equal(run("playerCollidesAt(8,0)"), false);
});
test("one focused tag only, exactly at the object; nothing selected at spawn", () => {
  const { run } = harness();
  run("updateWorldLabels()");
  assert.equal(run("focusedGroundTag()"), null);
  run(
    "pPos.set(0,.5,5);camera.position.set(14,18,20);camera.lookAt(0,0,6);camera.updateMatrixWorld();updateWorldLabels();projectGroundTags(1)",
  );
  assert.equal(
    run(
      "groundTagMeshes.filter(g=>g.userData.el.style.visibility==='visible').length",
    ),
    1,
  );
  assert.equal(run("focusedGroundTag().position.z"), 6);
  run(
    "camera.position.set(0,20,20);camera.lookAt(0,0,0);camera.updateMatrixWorld()",
  );
  assert.equal(run("baseGroundTag.position.z"), 0);
});
test("only first two nights have fewer enemies", () => {
  const { run } = harness();
  assert.equal(
    run("[1,2,3,4,5,6,7].map(nightEnemyCount).join()"),
    "16,24,35,42,49,56,34",
  );
});
