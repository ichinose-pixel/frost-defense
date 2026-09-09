// ============ 敵 ============
function makeWolf(){
  const g=new THREE.Group(), c=0x8996aa;
  const body=box(.82,.38,.38,c); body.position.y=.56; g.add(body);
  const head=box(.34,.34,.34,c); head.position.set(.5,.72,0); g.add(head);
  addVoxelDetails(g,[[.18,.16,.18,0xaab5c4,.5,.92,0],[.08,.08,.05,0xffb04a,.69,.76,.18],[.08,.08,.05,0xffb04a,.69,.76,-.18],[.18,.13,.2,0x657185,.72,.64,0]]);
  const legs=[];
  [[-.28,-.13],[-.28,.13],[.26,-.13],[.26,.13]].forEach(([px,pz])=>{ const l=box(.11,.38,.11,0x657185); l.geometry.translate(0,-.19,0); l.position.set(px,.38,pz); g.add(l); legs.push(l); });
  const tail=box(.38,.11,.11,0x9ba8ba); tail.position.set(-.55,.68,0); tail.rotation.z=.4; g.add(tail);
  return {g,legs};
}
function makeRaider(scale=1){
  const g=new THREE.Group(), coat=scale>1?0x7a2c2c:0x454b58;
  const body=box(.5,.58,.32,coat); body.position.y=1.0; g.add(body);
  addVoxelDetails(g,[[.46,.1,.35,0x242a34,0,.82,0],[.12,.12,.08,0x758096,-.16,1.12,.2],[.12,.12,.08,0x758096,.16,1.12,.2]]);
  const head=box(.36,.36,.36,0xd8b088); head.position.y=1.48; g.add(head);
  addVoxelDetails(g,[[.42,.13,.42,0x2d3440,0,1.68,0],[.08,.06,.03,0x15191f,-.1,1.51,.2],[.08,.06,.03,0x15191f,.1,1.51,.2]]);
  const legs=[];
  [[-.13,0],[.13,0]].forEach(([px,pz])=>{ const l=box(.17,.54,.17,0x292f3a); l.geometry.translate(0,-.27,0); l.position.set(px,.54,pz); g.add(l); legs.push(l); });
  const arms=[];
  [[-.34,0],[.34,0]].forEach(([px,pz])=>{ const a=box(.15,.54,.15,coat); a.geometry.translate(0,-.25,0); a.position.set(px,1.23,pz); g.add(a); arms.push(a); });
  g.scale.setScalar(scale);
  return {g,legs,arms};
}
function spawnEnemy(x=null,z=null,kindOverride=null){
  const a=Math.random()*Math.PI*2, r=R_INNER-1.2;
  if(x===null||z===null){ x=Math.round(Math.cos(a)*r); z=Math.round(Math.sin(a)*r); }
  const kind = kindOverride || (day>=4&&waveLeft<=1 ? 'boss' : Math.random()<.62?'wolf':'raider');
  const model = kind==='wolf'?makeWolf():makeRaider(kind==='boss'?1.6:1);
  const hp=(kind==='wolf'?24:kind==='boss'?185:46)+day*6;
  model.g.position.set(x,.5,z);
  const bb=box(.8,.1,.05,0x222222); bb.position.y=kind==='boss'?3.1:2.1; model.g.add(bb);
  const bf=box(.8,.12,.06,0xff4444); bf.position.y=bb.position.y; model.g.add(bf);
  scene.add(model.g);
  enemies.push({kind,model,hp,max:hp,sp:kind==='wolf'?3.15:kind==='boss'?1.45:1.95,dmg:kind==='wolf'?7:kind==='boss'?22:11,atkT:0,bar:bf,walkT:Math.random()*6});
}
function spawnEnemyPack(){
  if(waveLeft<=0) return;
  const a=Math.random()*Math.PI*2, r=R_INNER-1.2;
  const baseX=Math.round(Math.cos(a)*r), baseZ=Math.round(Math.sin(a)*r);
  const pack=(day>=4&&waveLeft<=2)?1:Math.min(4,2+Math.floor(day/2)+(Math.random()<.55?1:0));
  for(let i=0;i<pack&&waveLeft>0;i++){
    const ox=(Math.random()*2-1)*1.4, oz=(Math.random()*2-1)*1.4;
    const kind=(day>=4&&waveLeft===1&&i===0)?'boss':null;
    spawnEnemy(Math.round(baseX+ox),Math.round(baseZ+oz),kind);
    waveLeft--;
  }
}

// ============ 矢 ============
function shootArrow(from,dir,dmg,home){
  const m=box(.07,.07,.55,0xffe08a);
  m.position.copy(from);
  m.lookAt(from.clone().add(dir));
  scene.add(m);
  arrows.push({m,v:dir.clone().multiplyScalar(26),dmg,life:2,home:home||null});
}

// ============ 入力：移動だけ ============
const keys={};
addEventListener('keydown',e=>{ keys[e.code]=true; });
addEventListener('keyup',e=>keys[e.code]=false);
let joyId=null,joyVec={x:0,y:0};
const joyZone=$('joyZone'),joyBase=$('joyBase'),joyKnob=$('joyKnob');
joyZone.addEventListener('pointerdown',e=>{
  if(!running) return; joyId=e.pointerId; joyZone.setPointerCapture?.(e.pointerId);
  joyBase.style.display=joyKnob.style.display='block';
  joyBase._ox=e.clientX; joyBase._oy=e.clientY;
  joyBase.style.left=(e.clientX-62)+'px'; joyBase.style.top=(e.clientY-62)+'px';
  joyKnob.style.left=(e.clientX-27)+'px'; joyKnob.style.top=(e.clientY-27)+'px';
});
addEventListener('pointermove',e=>{
  if(e.pointerId!==joyId) return;
  let dx=e.clientX-joyBase._ox,dy=e.clientY-joyBase._oy; const d=Math.hypot(dx,dy),max=48;
  if(d>max){dx*=max/d;dy*=max/d;}
  joyKnob.style.left=(joyBase._ox+dx-27)+'px'; joyKnob.style.top=(joyBase._oy+dy-27)+'px';
  joyVec={x:dx/max,y:-dy/max};
});
function endJoy(e){ if(e.pointerId!==joyId)return; joyId=null;joyVec={x:0,y:0};joyBase.style.display=joyKnob.style.display='none'; }
addEventListener('pointerup',endJoy); addEventListener('pointercancel',endJoy);
function bindCanvasLook(){ renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault()); }
function setMode(m){ mode=m; }
function addFuel(){ /* 自動補給に移行 */ }

// ============ 建設 ============
const ray=new THREE.Raycaster();
function aimCell(){
  // 建築は「プレイヤーの向いている方向」にスナップ。スマホで狙いやすい。
  if(mode===1||mode===2||mode===3){
    const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const p=pPos.clone().add(f.multiplyScalar(2.25));
    const x=Math.round(p.x), z=Math.round(p.z);
    if(mode===3){
      // 撤去は手前から探索
      for(let d=1;d<=3;d++){
        const q=pPos.clone().add(new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(d));
        const qx=Math.round(q.x), qz=Math.round(q.z);
        for(let y=3;y>=1;y--){ const b=blockAt(qx,y,qz); if(b&&(b.t==='wall'||b.t==='turret')) return {x:qx,y,z:qz,hit:b}; }
      }
    }
    return {x,y:1,z,hit:blockAt(x,0,z)||null};
  }
  ray.setFromCamera({x:0,y:0},camera);
  const hits=ray.intersectObject(inst);
  for(const h of hits){
    if(h.instanceId===undefined||!blockArr[h.instanceId]) continue;
    const b=blockArr[h.instanceId], n=h.face.normal;
    return {x:b.x+Math.round(n.x),y:b.y+Math.round(n.y),z:b.z+Math.round(n.z),hit:b};
  }
  return null;
}

function doAction(){ /* 攻撃・建築は完全自動 */ }
function addTurretVisual(x,y,z,level=1){
  const k=key(x,y,z);
  if(turretObjs.has(k)) scene.remove(turretObjs.get(k));
  const g=new THREE.Group();
  const pole=box(.22,1.05,.22,level>=3?0x7b8ca2:0x586c80); pole.position.y=1.02; g.add(pole);
  addVoxelDetails(g,[
    [.6,.14,.6,level>=2?0x95aac0:0x7f94a8,0,1.55,0],[.74,.12,.18,0xaebed0,0,1.68,0],
    [.18,.12,.74,0xaebed0,0,1.68,0],[.14,.5,.14,0x3d2b1d,-.22,1.94,0],[.14,.5,.14,0x3d2b1d,.22,1.94,0],
    [.52,.08,.08,level>=2?0xffde89:0xe5bf76,0,2.05,0]
  ]);
  if(level>=2){ addVoxelDetails(g,[[.94,.08,.1,0xffd36b,0,2.18,0],[.1,.08,.94,0xffd36b,0,2.18,0],[.18,.18,.18,0xffd36b,0,2.35,0]]); }
  if(level>=3){ addVoxelDetails(g,[[.16,.8,.16,0x9ed7ff,0,2.52,0],[.34,.12,.34,0xffecad,0,2.96,0],[.12,.38,.12,0x8fe5ff,-.42,2.08,0],[.12,.38,.12,0x8fe5ff,.42,2.08,0]]); }
  g.position.set(x,y,z); scene.add(g); g.userData.level=level;
  turretObjs.set(k,g);
}

