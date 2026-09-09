// ============ 基本 ============
const R_INNER = 27;
const WORLD_EDGE = 31;
const COST = { wall: 15, turret: 40, flame: 55, warehouse: 45 };
const WALL_HP = 220,
  TURRET_HP = 110,
  T_RANGE = 10,
  T_RATE = 0.72,
  MAX_DEF_LV = 3;
let scene, camera, renderer, clock;
let inst,
  blockArr = [],
  blocks = new Map();
let wood = 70,
  coal = 30,
  iron = 0,
  fuel = 100,
  baseHP = 300,
  baseMax = 300,
  day = 1,
  phase = "day",
  phaseT = 30,
  temp = -10;
let enemies = [],
  arrows = [],
  turretObjs = new Map(),
  flameObjs = new Map(),
  warehouseObjs = new Map();
let running = false,
  mode = 0,
  nightK = 0,
  shake = 0,
  harvestT = 0,
  shootCD = 0,
  combo = 0,
  comboT = 0,
  kills = 0,
  tutorialStep = 0,
  upgrading = false,
  fuelAutoCD = 0;
let yaw = 0,
  moveSpeed = 6.0,
  playerDmg = 16,
  turretDmg = 10,
  fireDrainMul = 1,
  resourceRespawnT = 8;
const CAM_OFFSET = new THREE.Vector3(14.5, 17.2, 15.0);
let camLook = new THREE.Vector3();
let buildPads = [],
  workerObjs = [],
  settlementObjs = [],
  flyPickups = [];
let gatherRing, attackRing;
let wallDecorObjs = new Map(),
  defenseState = new Map(),
  defenseLabelEls = new Map();
let warehouseBonus = 0,
  rescued = 0,
  rescueSpawnedForDay = 0,
  rescueNPC = null,
  gameElapsed = 0,
  baseLevel = 1,
  baseUpgradeProgress = 0,
  baseLabelEl = null;
let outposts = [],
  outpostProdT = 0,
  nightModifier = "normal",
  stageClear = false,
  groundTagMeshes = [];
let audioCtx = null,
  masterGain = null,
  lastSfx = {};
const camRay = new THREE.Raycaster();
camRay.far = 10;
const key = (x, y, z) => x + "," + y + "," + z;
const $ = (id) => document.getElementById(id);
const COLORS = {
  snow: 0xf2f6fb,
  rock: 0x9fb0c2,
  wood: 0x8a5a2b,
  leaf: 0x3f8f5f,
  coal: 0x454a56,
  wall: 0xc49a63,
  turret: 0x7a8ca0,
  flame: 0xb56d46,
  warehouse: 0x8a684a,
};

let sun,
  hemi,
  fireLight,
  fireGroup,
  flamePts,
  flameData,
  snowPts,
  snowData,
  debrisPts,
  debrisData,
  ghost,
  player,
  limbs = {};

let baseGroundTag = null;

let pPos = new THREE.Vector3(0, 0.5, 4),
  pVel = { x: 0, z: 0 };

const PLAYER_RADIUS = 0.34;
let waveLeft = 0,
  spawnT = 0,
  worldDirty = true;
let contextLost = false,
  uiTime = 0;
