function damageOutpost(o,dmg){o.hp-=dmg;if(o.hp<=0){o.hp=0;o.captured=false;o.progress=0;showWaveBanner('OUTPOST LOST',outpostInfo(o.type).name+' が陥落');}}
function chooseNightModifier(){
  const pool=day<=2?['normal','wolf']:['blizzard','wolf','fuel','armored','siege']; if(day===6) pool.push('bossOmen'); nightModifier=pool[Math.floor(Math.random()*pool.length)];
  const map={normal:['静かな夜','通常襲撃'],blizzard:['猛吹雪','見張り台射程 -25%'],wolf:['狼の夜','高速の狼が大量出現'],fuel:['燃料危機','燃料消費 +70%'],armored:['重装襲来','高耐久兵が増加'],siege:['破城の夜','防壁狙いが増加'],bossOmen:['巨大な足跡','次夜にボス襲来']}; return map[nightModifier];
}

function addBuildPads(){
  const defs=[];
  for(const x of [-6,-3,0,3,6]){ defs.push([x,-6,'wall',15]); defs.push([x,6,'wall',15]); }
  for(const z of [-3,0,3]){ defs.push([-6,z,'wall',15]); defs.push([6,z,'wall',15]); }
  defs.push([-8,-8,'turret',40],[8,-8,'turret',40],[-8,8,'turret',40],[8,8,'turret',40]);
  defs.push([0,-10,'flame',55],[0,10,'flame',55]);
  defs.push([-10,0,'warehouse',45],[10,0,'warehouse',45]);
  defs.forEach(([x,z,type,cost],i)=>{
    const g=new THREE.Group();
    const c=type==='turret'?0x67b7ff:type==='flame'?0xff8b55:type==='warehouse'?0x9de3a0:0xffd36b;
    const ring=new THREE.Mesh(new THREE.CylinderGeometry(type==='wall'?1.28:.78,type==='wall'?1.28:.78,.07,32),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.27}));
    ring.position.y=.57; g.add(ring);
    const core=box(type==='wall'?1.15:.46,.08,type==='wall'?.22:.46,c); core.position.y=.66; g.add(core);
    g.position.set(x,0,z); scene.add(g);
    const labelEl=makeWorldLabel(); const gc=getBuildCost({type,cost}); const tag=makeGroundTag(typeIcon(type)+' '+typeName(type),'🌲'+gc.wood+(gc.coal?'  🪨'+gc.coal:''),c,2.7,.8); tag.position.set(x,.08,z+1.45);
    buildPads.push({g,x,z,type,cost,built:false,progress:0,index:i,labelEl,tag});
  });
}
function getDefenseMaxHp(type,level){ const base=type==='wall'?WALL_HP:type==='warehouse'?150:110; return Math.round(base*(1+(level-1)*0.65)); }
function getUpgradeCost(state){
  if(state.type==='wall') return state.level===1?{wood:24,coal:0}:state.level===2?{wood:44,coal:10}:{wood:999,coal:999};
  if(state.type==='turret') return state.level===1?{wood:34,coal:14}:state.level===2?{wood:56,coal:26}:{wood:999,coal:999};
  if(state.type==='flame') return state.level===1?{wood:38,coal:22}:state.level===2?{wood:60,coal:38}:{wood:999,coal:999};
  return state.level===1?{wood:32,coal:10}:state.level===2?{wood:50,coal:22}:{wood:999,coal:999};
}
function addWallDecor(x,y,z,level=1){
  const k=key(x,y,z); if(wallDecorObjs.has(k)){ scene.remove(wallDecorObjs.get(k)); wallDecorObjs.delete(k); }
  const g=new THREE.Group();
  const tangent = Math.abs(x)>=Math.abs(z) ? 'z' : 'x';
  for(let i=-4;i<=4;i++){
    const post=box(.26,1.75,.26, level>=3?0xd8b06d:0x8b5c32); post.position.y=1.05;
    if(tangent==='x') post.position.x=i*.32; else post.position.z=i*.32;
    g.add(post);
    const tip=box(.19,.32,.19,0xe3c084); tip.position.copy(post.position); tip.position.y=2.08; tip.rotation.z=.18; g.add(tip);
  }
  const rail1=box(tangent==='x'?2.9:.22,.18,tangent==='x'?.22:2.9,0x694421); rail1.position.y=1.05; g.add(rail1);
  const rail2=rail1.clone(); rail2.position.y=1.55; g.add(rail2);
  if(level>=2){ const cap=box(tangent==='x'?3.05:.3,.14,tangent==='x'?.3:3.05,0xd5a35e); cap.position.y=1.92; g.add(cap); }
  if(level>=3){ const banner=box(.2,.8,.06,0x6fa9ff); banner.position.set(tangent==='x'?1.15:.15,2.45,tangent==='x'?.15:1.15); g.add(banner); }
  g.position.set(x,y-.5,z); scene.add(g); wallDecorObjs.set(k,g);
}
function addFlameVisual(x,y,z,level=1){
  const k=key(x,y,z); if(flameObjs.has(k)) scene.remove(flameObjs.get(k));
  const g=new THREE.Group();
  addVoxelDetails(g,[[.9,.35,.9,0x705342,0,.72,0],[.58,.8,.58,0x8f684d,0,1.15,0],[1.1,.12,.3,0x463025,0,1.55,0],[.3,.12,1.1,0x463025,0,1.55,0]]);
  const flame=new THREE.PointLight(0xff6633,1.6+level*.9,7+level*2,1.5); flame.position.set(0,2,0); g.add(flame);
  addVoxelDetails(g,[[.25,.55,.25,0xff8b32,0,1.95,0],[.15,.38,.15,0xffe074,0,2.18,0]]);
  if(level>=2) addVoxelDetails(g,[[.15,.7,.15,0x8fe5ff,-.45,1.95,0],[.15,.7,.15,0x8fe5ff,.45,1.95,0]]);
  g.position.set(x,y,z); scene.add(g); g.userData.level=level; flameObjs.set(k,g);
}
function addWarehouseVisual(x,y,z,level=1){
  const k=key(x,y,z); if(warehouseObjs.has(k)) scene.remove(warehouseObjs.get(k));
  const g=new THREE.Group();
  addVoxelDetails(g,[[1.55,.95,1.35,0x8f6945,0,1,0],[1.75,.28,1.55,0x594437,0,1.67,0],[.55,.48,.08,0x493322,0,1.08,.72]]);
  for(let i=0;i<level+1;i++) addVoxelDetails(g,[[.48,.34,.48,0xc69a62,-.55+i*.52,.58,.78]]);
  if(level>=3) addVoxelDetails(g,[[.22,.95,.22,0x6fa9ff,.68,2.1,0],[.62,.3,.08,0xffd36b,.68,2.45,0]]);
  g.position.set(x,y,z); scene.add(g); g.userData.level=level; warehouseObjs.set(k,g);
}
function refreshDefenseVisual(x,y,z){
  const st=defenseState.get(key(x,y,z)); if(!st) return;
  if(st.type==='turret') addTurretVisual(x,y,z,st.level); else if(st.type==='flame') addFlameVisual(x,y,z,st.level); else if(st.type==='warehouse') addWarehouseVisual(x,y,z,st.level); else addWallDecor(x,y,z,st.level);
}
function findUpgradeableDefenseNear(){
  let best=null, bd=1.45;
  updateBaseLabel();
  defenseState.forEach((st,k)=>{
    if(st.level>=MAX_DEF_LV) return;
    const [x,y,z]=k.split(',').map(Number); const d=Math.hypot(x-pPos.x,z-pPos.z);
    if(d<bd){ bd=d; best={x,y,z,state:st}; }
  });
  return best;
}
function upgradeDefense(hit){
  const st=hit.state; const cost=getUpgradeCost(st);
  if(wood<cost.wood||coal<cost.coal) return false;
  wood-=cost.wood; coal-=cost.coal; st.level++; st.maxHp=getDefenseMaxHp(st.type,st.level); st.hp=st.maxHp; if(st.type==='warehouse') warehouseBonus+=25;
  const b=blockAt(hit.x,hit.y,hit.z); if(b) b.hp=st.maxHp;
  refreshDefenseVisual(hit.x,hit.y,hit.z);
  spawnPickupTrail(player.position.x,1.1,player.position.z,st.type==='turret'?0x8ed1ff:0xffd27a,12,new THREE.Vector3(hit.x,1.25,hit.z));
  spawnJuiceChunks(hit.x,1.3,hit.z,st.type==='turret'?0x8ed1ff:0xffd27a,16,null,'upgrade'); punch(.16);
  burst(hit.x,1.2,hit.z,st.type==='turret'?0x8ed1ff:0xffd27a,18);
  worldPop(typeName(st.type)+' Lv.'+st.level,new THREE.Vector3(hit.x,2.3,hit.z),'#ffe19a');
  sfx('upgrade'); showWaveBanner('UPGRADE!',typeName(st.type)+' Lv.'+st.level);
  toast(typeIcon(st.type)+' '+typeName(st.type)+' をLv.'+st.level+'に進化');
  updateHUD();
  return true;
}
function updateDefenseUpgrades(dt){
  if(phase!=='day') return;
  const hit=findUpgradeableDefenseNear();
  if(!hit) return;
  const st=hit.state, cost=getUpgradeCost(st);
  if(wood>=cost.wood && coal>=cost.coal){
    st._progress=(st._progress||0)+dt;
    if(Math.random()<dt*8) spawnPickupTrail(player.position.x,.95,player.position.z,st.type==='turret'?0x8ed1ff:0xffd27a,2,new THREE.Vector3(hit.x,1.2,hit.z));
    if(st._progress>.48){ st._progress=0; upgradeDefense(hit); }
  } else {
    st._progress=0;
    if(Math.random()<dt*.6) toast((st.type==='turret'?'🏹':'🧱')+' 進化に 木材'+cost.wood+' / 石炭'+cost.coal+' が必要');
  }
}
