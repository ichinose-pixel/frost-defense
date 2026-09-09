// ============ 基本 ============
const R_INNER=27;                 // 行動範囲(チェビシェフ半径)
const WORLD_EDGE=31;
const COST={wall:15,turret:40,flame:55,warehouse:45};
const WALL_HP=220, TURRET_HP=110, T_RANGE=10, T_RATE=.72, MAX_DEF_LV=3;
let scene,camera,renderer,clock;
let inst, blockArr=[], blocks=new Map();
let wood=70, coal=30, fuel=100, baseHP=300, baseMax=300, day=1, phase='day', phaseT=30, temp=-10;
let enemies=[], arrows=[], turretObjs=new Map(), flameObjs=new Map(), warehouseObjs=new Map();
let running=false, mode=0, nightK=0, shake=0, harvestT=0, shootCD=0, combo=0, comboT=0, kills=0, tutorialStep=0, upgrading=false, fuelAutoCD=0;
let yaw=0, moveSpeed=6.0, playerDmg=16, turretDmg=10, fireDrainMul=1, resourceRespawnT=8;
const CAM_OFFSET=new THREE.Vector3(14.5,17.2,15.0);
let camLook=new THREE.Vector3();
let buildPads=[], workerObjs=[], settlementObjs=[], flyPickups=[];
let gatherRing, attackRing;
let wallDecorObjs=new Map(), defenseState=new Map(), defenseLabelEls=new Map();
let warehouseBonus=0, rescued=0, rescueSpawnedForDay=0, rescueNPC=null, gameElapsed=0, baseLevel=1, baseUpgradeProgress=0, baseLabelEl=null;
const camRay=new THREE.Raycaster(); camRay.far=10;
const key=(x,y,z)=>x+','+y+','+z;
const $=id=>document.getElementById(id);

// ============ 色 ============
const COLORS={snow:0xf2f6fb, rock:0x9fb0c2, wood:0x8a5a2b, leaf:0x3f8f5f, coal:0x454a56, wall:0xc49a63, turret:0x7a8ca0, flame:0xb56d46, warehouse:0x8a684a};
function hashJitter(x,y,z){ let h=(x*73856093)^(y*19349663)^(z*83492791); h=Math.abs(h%100)/100; return .92+h*.16; }

// ============ ワールド生成 ============
function setBlock(x,y,z,t,hp){ blocks.set(key(x,y,z),{t,hp:hp||0}); rebuild(); }
function removeBlock(x,y,z){
  const k=key(x,y,z), b=blocks.get(k); if(!b) return;
  blocks.delete(k);
  if(turretObjs.has(k)){ scene.remove(turretObjs.get(k)); turretObjs.delete(k); }
  if(flameObjs.has(k)){ scene.remove(flameObjs.get(k)); flameObjs.delete(k); }
  if(warehouseObjs.has(k)){ scene.remove(warehouseObjs.get(k)); warehouseObjs.delete(k); }
  if(wallDecorObjs.has(k)){ scene.remove(wallDecorObjs.get(k)); wallDecorObjs.delete(k); }
  if(defenseLabelEls.has(k)){ defenseLabelEls.get(k).remove(); defenseLabelEls.delete(k); }
  defenseState.delete(k);
  rebuild();
}
function blockAt(x,y,z){ return blocks.get(key(x,y,z)); }

function buildTerrain(){
  blocks.clear();
  turretObjs.forEach(g=>scene.remove(g)); turretObjs.clear();
  flameObjs.forEach(g=>scene.remove(g)); flameObjs.clear();
  warehouseObjs.forEach(g=>scene.remove(g)); warehouseObjs.clear();
  wallDecorObjs.forEach(g=>scene.remove(g)); wallDecorObjs.clear();
  defenseLabelEls.forEach(el=>el.remove()); defenseLabelEls.clear();
  defenseState.clear();
  for(let x=-WORLD_EDGE;x<=WORLD_EDGE;x++)for(let z=-WORLD_EDGE;z<=WORLD_EDGE;z++){
    const r=Math.max(Math.abs(x),Math.abs(z));
    if(r<=R_INNER){ blocks.set(key(x,0,z),{t:'snow',hp:0}); }
    else if(r<=WORLD_EDGE){ const h=2+((x*7+z*13)%4+4)%4; for(let y=0;y<h;y++) blocks.set(key(x,y,z),{t:'rock',hp:0}); }
  }
  let placed=0, guard=0;
  while(placed<42&&guard++<2200){
    const x=(Math.random()*2-1)*(R_INNER-3)|0, z=(Math.random()*2-1)*(R_INNER-3)|0;
    if(Math.max(Math.abs(x),Math.abs(z))<6) continue;
    if(Math.abs(x)<=4&&z>=2&&z<=11) continue;
    let ok=true;
    for(let y=1;y<=5;y++) if(blockAt(x,y,z)){ok=false;break;}
    if(!ok) continue;
    for(let y=1;y<=3;y++) blocks.set(key(x,y,z),{t:'wood',hp:0});
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) if(!blockAt(x+dx,4,z+dz)) blocks.set(key(x+dx,4,z+dz),{t:'leaf',hp:0});
    blocks.set(key(x,5,z),{t:'leaf',hp:0});
    if(Math.random()<.35 && !blockAt(x+2,1,z+1)){
      for(let y=1;y<=2;y++) blocks.set(key(x+2,y,z+1),{t:'wood',hp:0});
      if(!blockAt(x+2,3,z+1)) blocks.set(key(x+2,3,z+1),{t:'leaf',hp:0});
    }
    placed++;
  }
  placed=0; guard=0;
  while(placed<22&&guard++<1400){
    const x=(Math.random()*2-1)*(R_INNER-3)|0, z=(Math.random()*2-1)*(R_INNER-3)|0;
    if(Math.max(Math.abs(x),Math.abs(z))<6||blockAt(x,1,z)) continue;
    blocks.set(key(x,1,z),{t:'coal',hp:0});
    if(Math.random()<.75&&!blockAt(x,2,z)) blocks.set(key(x,2,z),{t:'coal',hp:0});
    if(Math.random()<.35&&!blockAt(x+1,1,z)) blocks.set(key(x+1,1,z),{t:'coal',hp:0});
    placed++;
  }
  rebuild();
}

function rebuild(){
  blockArr=[...blocks.entries()].map(([k,b])=>{ const [x,y,z]=k.split(',').map(Number); return {x,y,z,b}; });
  inst.count=blockArr.length;
  const m=new THREE.Matrix4(), c=new THREE.Color();
  blockArr.forEach((e,i)=>{
    m.makeTranslation(e.x,e.y,e.z); inst.setMatrixAt(i,m);
    c.setHex(COLORS[e.b.t]); c.multiplyScalar(hashJitter(e.x,e.y,e.z));
    inst.setColorAt(i,c);
  });
  inst.instanceMatrix.needsUpdate=true;
  if(inst.instanceColor) inst.instanceColor.needsUpdate=true;
}

// ============ シーン構築 ============
let sun, hemi, fireLight, fireGroup, flamePts, flameData, snowPts, snowData, debrisPts, debrisData, ghost, player, limbs={};
function initScene(){
  scene=new THREE.Scene(); scene.background=new THREE.Color(0xbcd8ee);
  scene.fog=new THREE.Fog(0xbcd8ee,25,70);
  camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,200);
  camera.position.set(8.6,12,14);
  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  document.body.appendChild(renderer.domElement);
  clock=new THREE.Clock();
  hemi=new THREE.HemisphereLight(0xcfe5ff,0x8a97a8,.9); scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffffff,1.15); sun.position.set(20,30,10); scene.add(sun);
  // ブロック
  const geo=new THREE.BoxGeometry(1,1,1);
  const mat=new THREE.MeshLambertMaterial();
  inst=new THREE.InstancedMesh(geo,mat,8000);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(inst);
  buildTerrain();
  // 焚き火
  fireGroup=new THREE.Group();
  const logG=new THREE.BoxGeometry(.9,.25,.25), logM=new THREE.MeshLambertMaterial({color:0x6a4520});
  for(let i=0;i<3;i++){ const l=new THREE.Mesh(logG,logM); l.rotation.y=i*Math.PI/3; l.position.y=.6; fireGroup.add(l); }
  const stoneG=new THREE.BoxGeometry(.3,.3,.3), stoneM=new THREE.MeshLambertMaterial({color:0x777788});
  for(let i=0;i<8;i++){ const s=new THREE.Mesh(stoneG,stoneM); const a=i/8*Math.PI*2; s.position.set(Math.cos(a)*.9,.65,Math.sin(a)*.9); fireGroup.add(s); }
  fireLight=new THREE.PointLight(0xff8830,2.2,20,1.2); fireLight.position.set(0,1.6,0); fireGroup.add(fireLight);
  scene.add(fireGroup);
  // 炎パーティクル
  flameData=Array.from({length:36},()=>({life:Math.random()}));
  const fg=new THREE.BufferGeometry(); fg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36*3),3));
  flamePts=new THREE.Points(fg,new THREE.PointsMaterial({color:0xffaa33,size:.34,transparent:true,opacity:.95,depthWrite:false}));
  scene.add(flamePts);
  // 雪
  snowData=Array.from({length:720},()=>({x:(Math.random()*2-1)*26,y:Math.random()*18,z:(Math.random()*2-1)*26,v:1.5+Math.random()*2.5}));
  const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(720*3),3));
  snowPts=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:.09,transparent:true,opacity:.85,depthWrite:false}));
  scene.add(snowPts);
  // 破片
  debrisData=Array.from({length:200},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,r:1,g:1,b:1}));
  const dg=new THREE.BufferGeometry();
  dg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(200*3),3));
  dg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(200*3),3));
  debrisPts=new THREE.Points(dg,new THREE.PointsMaterial({size:.18,vertexColors:true,transparent:true,depthWrite:false}));
  scene.add(debrisPts);
  // ゴースト
  ghost=new THREE.Mesh(new THREE.BoxGeometry(1.04,1.04,1.04),new THREE.MeshBasicMaterial({color:0x66ff88,transparent:true,opacity:.35,depthWrite:false}));
  ghost.visible=false; scene.add(ghost);
  buildPlayer();
  gatherRing=makeRing(2.0,0x7ee0ff,.28); scene.add(gatherRing);
  attackRing=makeRing(8.2,0xffc46f,.12); scene.add(attackRing);
}

function makeRing(radius,color,opacity){
  const g=new THREE.RingGeometry(radius-.08,radius,40);
  const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.Mesh(g,m);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.y=.06;
  return mesh;
}

function burst(x,y,z,hex,n=8){
  const c=new THREE.Color(hex); let done=0;
  for(const d of debrisData){ if(d.life>0) continue;
    d.life=.4+Math.random()*.4; d.x=x; d.y=y; d.z=z;
    d.vx=(Math.random()-.5)*4; d.vy=2+Math.random()*3; d.vz=(Math.random()-.5)*4;
    d.r=c.r; d.g=c.g; d.b=c.b;
    if(++done>=n) break; }
}
function spawnPickupTrail(x,y,z,colorHex,count,target){
  for(let i=0;i<count;i++) flyPickups.push({
    pos:new THREE.Vector3(x+(Math.random()-.5)*.45,y+(Math.random()-.5)*.25,z+(Math.random()-.5)*.45),
    vel:new THREE.Vector3((Math.random()-.5)*2,.8+Math.random()*.8,(Math.random()-.5)*2),
    target:target.clone(),
    life:.85+Math.random()*.25,
    color:colorHex,
    size:.12+Math.random()*.06
  });
}
function worldPop(textMsg,pos,color='#fff'){
  const v=pos.clone().project(camera);
  if(v.z<-1||v.z>1) return;
  const el=document.createElement('div'); el.className='worldPop'; el.textContent=textMsg; el.style.color=color;
  el.style.left=((v.x*.5+.5)*innerWidth)+'px'; el.style.top=((-v.y*.5+.5)*innerHeight)+'px';
  document.body.appendChild(el); setTimeout(()=>el.remove(),760);
}
function showWaveBanner(main,sub=''){
  const el=$('waveBanner'); el.innerHTML=main+(sub?`<div style="font-size:.34em;margin-top:6px;color:#a9cfff;letter-spacing:.12em">${sub}</div>`:'');
  el.classList.add('show'); clearTimeout(el._tm); el._tm=setTimeout(()=>el.classList.remove('show'),1200);
}

