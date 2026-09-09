// ============ キャンプ成長・自動建築 ============
function clearCampExtras(){
  for(const o of [...buildPads,...workerObjs,...settlementObjs]) if(o.g) scene.remove(o.g); else scene.remove(o);
  buildPads.forEach(p=>p.labelEl?.remove());
  buildPads=[]; workerObjs=[]; settlementObjs=[];
  wallDecorObjs.forEach(g=>scene.remove(g)); wallDecorObjs.clear();
  turretObjs.forEach(g=>scene.remove(g)); turretObjs.clear(); flameObjs.forEach(g=>scene.remove(g)); flameObjs.clear(); warehouseObjs.forEach(g=>scene.remove(g)); warehouseObjs.clear();
  defenseLabelEls.forEach(el=>el.remove()); defenseLabelEls.clear(); defenseState.clear();
}
function makeWorldLabel(){ const el=document.createElement('div'); el.className='worldLabel'; document.body.appendChild(el); return el; }
function typeName(t){ return t==='wall'?'木柵':t==='turret'?'見張り台':t==='flame'?'火炎塔':'倉庫'; }
function typeIcon(t){ return t==='wall'?'🧱':t==='turret'?'🏹':t==='flame'?'🔥':'📦'; }
function requiredBaseLevel(type){ return type==='wall'||type==='turret'?1:type==='flame'?2:3; }
function baseUpgradeCost(){ return baseLevel===1?{wood:70,coal:20}:baseLevel===2?{wood:110,coal:45}:baseLevel===3?{wood:160,coal:75}:{wood:999,coal:999}; }
function baseLevelName(){ return baseLevel===1?'焚き火':baseLevel===2?'炉付きキャンプ':baseLevel===3?'防衛集落':'要塞拠点'; }
function ensureBaseLabel(){
  if(baseLabelEl) return;
  baseLabelEl=document.createElement('div'); baseLabelEl.className='baseWorldLabel'; document.body.appendChild(baseLabelEl);
}
function refreshBaseVisual(){
  fireGroup.scale.setScalar(1+baseLevel*.12);
  fireLight.distance=14+baseLevel*4;
  fireLight.intensity=2.0+baseLevel*.45;
  if(baseLevel>=2 && !fireGroup.userData.ring2){
    const g=new THREE.Group();
    for(let i=0;i<8;i++){ const b=box(.22,.55,.22,0x8d684b); const a=i/8*Math.PI*2; b.position.set(Math.cos(a)*1.45,.85,Math.sin(a)*1.45); g.add(b); }
    fireGroup.add(g); fireGroup.userData.ring2=g;
  }
  if(baseLevel>=3 && !fireGroup.userData.tower){
    const g=new THREE.Group();
    const core=box(1.2,1.0,1.2,0x8e6848); core.position.y=.7; g.add(core);
    const roof=box(1.5,.28,1.5,0x53677d); roof.position.y=1.35; g.add(roof);
    fireGroup.add(g); fireGroup.userData.tower=g;
  }
  if(baseLevel>=4 && !fireGroup.userData.beacon){
    const g=new THREE.Group();
    const mast=box(.22,2.2,.22,0xb4c6d8); mast.position.y=1.7; g.add(mast);
    const flag=box(.75,.35,.08,0x7ebcff); flag.position.set(.38,2.55,0); g.add(flag);
    fireGroup.add(g); fireGroup.userData.beacon=g;
  }
}
function upgradeBase(){
  if(baseLevel>=4) return false;
  const c=baseUpgradeCost(); if(wood<c.wood||coal<c.coal) return false;
  wood-=c.wood; coal-=c.coal; baseLevel++; baseUpgradeProgress=0;
  baseMax+=120; baseHP=baseMax; fuel=Math.min(100,fuel+35);
  moveSpeed*=1.04; playerDmg=Math.round(playerDmg*1.08);
  if(baseLevel>=2) { ensureWorkers(); wood+=20; }
  if(baseLevel>=3) { warehouseBonus+=25; coal+=15; }
  refreshBaseVisual(); updateCampVisual(); updateHUD();
  showWaveBanner('🏰 BASE Lv.'+baseLevel,baseLevelName()+' / 新設備解放');
  worldPop('拠点 Lv.'+baseLevel,new THREE.Vector3(0,3.2,0),'#ffd98b');
  return true;
}
function updateBaseUpgrade(dt){
  if(phase!=='day'||baseLevel>=4) return;
  const d=Math.hypot(pPos.x,pPos.z); if(d>2.8){ baseUpgradeProgress=0; return; }
  const c=baseUpgradeCost();
  if(wood>=c.wood&&coal>=c.coal){ baseUpgradeProgress+=dt; if(baseUpgradeProgress>.65) upgradeBase(); }
  else baseUpgradeProgress=0;
}
function updateBaseLabel(){
  ensureBaseLabel();
  if(baseLevel>=4){ baseLabelEl.innerHTML='🏰 '+baseLevelName()+' Lv.MAX'; }
  else { const c=baseUpgradeCost(), ready=wood>=c.wood&&coal>=c.coal; baseLabelEl.className='baseWorldLabel'+(ready?' ready':''); baseLabelEl.innerHTML='🏰 '+baseLevelName()+' Lv.'+baseLevel+' → '+(baseLevel+1)+'<span class="cost">🌲'+c.wood+'　🪨'+c.coal+'</span>'; }
  projectLabel(baseLabelEl,new THREE.Vector3(0,3.05,0),phase==='day'&&Math.hypot(pPos.x,pPos.z)<8.5);
}

function addBuildPads(){
  const defs=[];
  // 内周を連続した木柵で囲む。間隔を詰めて「壁」に見せる
  for(const x of [-6,-3,0,3,6]){ defs.push([x,-6,'wall',15]); defs.push([x,6,'wall',15]); }
  for(const z of [-3,0,3]){ defs.push([-6,z,'wall',15]); defs.push([6,z,'wall',15]); }
  // 四隅・前後に役割の異なる設備
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
    const labelEl=makeWorldLabel();
    buildPads.push({g,x,z,type,cost,built:false,progress:0,index:i,labelEl});
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
  // 連続木柵：1点ではなく約3マス幅のパリセード
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
  burst(hit.x,1.2,hit.z,st.type==='turret'?0x8ed1ff:0xffd27a,18);
  worldPop(typeName(st.type)+' Lv.'+st.level,new THREE.Vector3(hit.x,2.3,hit.z),'#ffe19a');
  showWaveBanner('UPGRADE!',typeName(st.type)+' Lv.'+st.level);
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

function buildFromPad(p){
  if(p.built||wood<p.cost) return false;
  const y=1; wood-=p.cost;
  const hp=getDefenseMaxHp(p.type,1);
  setBlock(p.x,y,p.z,p.type,hp);
  defenseState.set(key(p.x,y,p.z),{type:p.type,level:1,hp,maxHp:hp,_progress:0});
  refreshDefenseVisual(p.x,y,p.z);
  if(p.type==='warehouse'){ warehouseBonus+=40; wood+=12; coal+=6; }
  p.built=true; p.g.visible=false;
  const dx=pPos.x-p.x, dz=pPos.z-p.z; const d=Math.hypot(dx,dz);
  if(d<1.18){
    const nx=(d<0.001?1:dx/d), nz=(d<0.001?0:dz/d);
    pPos.x=p.x+nx*1.95; pPos.z=p.z+nz*1.95; resolvePlayerCollision();
  }
  spawnPickupTrail(player.position.x,1.1,player.position.z,0xffd27a,10,new THREE.Vector3(p.x,1.0,p.z));
  burst(p.x,1,p.z,p.type==='flame'?0xff7b45:p.type==='turret'?0x8ed1ff:0xffd27a,18); worldPop(typeName(p.type)+' 完成!',new THREE.Vector3(p.x,2.1,p.z),'#ffe19a'); toast(typeIcon(p.type)+' '+typeName(p.type)+' 完成!'); updateHUD();
  return true;
}
function getBuildCost(p){ if(p.type==='flame') return {wood:p.cost,coal:18}; if(p.type==='warehouse') return {wood:p.cost,coal:8}; return {wood:p.cost,coal:0}; }
function updateBuildPads(dt){
  for(const p of buildPads){
    if(p.built) continue;
    p.g.rotation.y+=dt*.7;
    const d=Math.hypot(p.x-pPos.x,p.z-pPos.z);
    if(d<1.65){
      const c=getBuildCost(p);
      if(wood>=c.wood&&coal>=c.coal){ p.progress+=dt; p.g.scale.setScalar(1+Math.sin(performance.now()*.014)*.08); if(p.progress>.42){ wood-=Math.max(0,c.wood-p.cost); coal-=c.coal; buildFromPad(p); } }
      else { p.progress=0; if(Math.random()<dt*.55) toast(typeIcon(p.type)+' '+typeName(p.type)+' に 🌲'+c.wood+(c.coal?' / 🪨'+c.coal:'')+' 必要'); }
    } else { p.progress=0; p.g.scale.setScalar(1); }
  }
}
function addSettlementPiece(kind,x,z){
  const g=new THREE.Group();
  if(kind==='tent'){
    const base=box(1.45,.56,1.18,0xb66e48); base.position.y=.82; g.add(base);
    addVoxelDetails(g,[
      [1.62,.18,1.35,0xe1b36b,0,1.18,0],[1.2,.12,1.48,0xd89a56,0,1.31,0],
      [.18,.42,.06,0x5d3c2c,0,.76,.62],[.24,.16,.06,0xffc561,.35,.92,.63]
    ]);
  }else{
    const base=box(1.68,.94,1.48,0x956139); base.position.y=1.0; g.add(base);
    addVoxelDetails(g,[
      [1.9,.22,1.7,0x665043,0,1.55,0],[1.62,.18,1.86,0x554137,0,1.72,0],
      [.34,.42,.06,0x553523,0,1.05,.78],[.29,.3,.06,0xffc968,.48,1.12,.78],
      [.29,.3,.06,0xffc968,-.48,1.12,.78],[.26,.52,.26,0x705446,.62,1.96,-.38]
    ]);
  }
  g.position.set(x,0,z); scene.add(g); settlementObjs.push(g);
}
function updateCampVisual(){
  settlementObjs.forEach(g=>scene.remove(g)); settlementObjs=[];
  if(day>=2){ addSettlementPiece('tent',-1.9,1.1); addSettlementPiece('tent',2.0,1.0); }
  if(day>=3){ addSettlementPiece('hut',-2.3,-1.4); }
  if(day>=4){ addSettlementPiece('hut',2.4,-1.4); }
  if(day>=5){ addSettlementPiece('tent',-4.2,1.8); addSettlementPiece('tent',4.2,1.8); }
  fireGroup.scale.setScalar(1+Math.min(day-1,5)*.08);
  fireLight.distance=14+Math.min(day,6)*2;
}
function makeWorker(i){
  const g=new THREE.Group();
  const body=box(.36,.5,.27,0x6f8bb3); body.position.y=.88; g.add(body);
  addVoxelDetails(g,[[.32,.09,.3,0x45617f,0,.72,0],[.12,.12,.06,0xd1e7ff,-.1,.98,.17],[.12,.12,.06,0xd1e7ff,.1,.98,.17]]);
  const head=box(.3,.3,.3,0xe4b88b); head.position.y=1.28; g.add(head);
  const hat=box(.35,.1,.35,0xc98a38); hat.position.y=1.47; g.add(hat);
  addVoxelDetails(g,[[.14,.08,.39,0xead6a5,0,1.42,0]]);
  g.position.set((i%2?1:-1)*(1+i*.25),.5,1.5); scene.add(g);
  workerObjs.push({g,t:i*1.7,target:null,workT:1+i*.4,shootCD:.4+i*.12});
}function ensureWorkers(){ while(workerObjs.length<Math.min(4,Math.max(0,day-1))) makeWorker(workerObjs.length); }
function findResourceNear(pos){
  let best=null,bd=1e9;
  for(const e of blockArr){ if(!['wood','leaf','coal'].includes(e.b.t)) continue; const d=(e.x-pos.x)**2+(e.z-pos.z)**2; if(d<bd){bd=d;best=e;} }
  return best;
}
function updateWorkers(dt,t){
  ensureWorkers();
  workerObjs.forEach((w,idx)=>{
    w.workT-=dt; w.shootCD-=dt;
    if(phase==='night'){
      let enemy=null,bd=6.2;
      for(const e of enemies){ const d=e.model.g.position.distanceTo(w.g.position); if(d<bd){bd=d;enemy=e;} }
      if(enemy){
        const dx=enemy.model.g.position.x-w.g.position.x,dz=enemy.model.g.position.z-w.g.position.z,d=Math.hypot(dx,dz)||1;
        w.g.rotation.y=Math.atan2(dx,dz);
        if(d>3.2){ w.g.position.x+=dx/d*1.35*dt; w.g.position.z+=dz/d*1.35*dt; }
        if(w.shootCD<=0){
          w.shootCD=1.05;
          const from=w.g.position.clone().add(new THREE.Vector3(0,1.15,0));
          const dir=enemy.model.g.position.clone().add(new THREE.Vector3(0,.8,0)).sub(from).normalize();
          shootArrow(from,dir,Math.max(6,Math.round(playerDmg*.42)),enemy);
        }
        return;
      }
    }
    if(!w.target || !blockAt(w.target.x,w.target.y,w.target.z)) w.target=findResourceNear(w.g.position);
    if(w.target){
      const dx=w.target.x-w.g.position.x,dz=w.target.z-w.g.position.z,d=Math.hypot(dx,dz);
      if(d>.9){ w.g.position.x+=dx/d*1.7*dt; w.g.position.z+=dz/d*1.7*dt; w.g.rotation.y=Math.atan2(dx,dz); }
      else if(w.workT<=0){
        const b=blockAt(w.target.x,w.target.y,w.target.z); if(b){ if(b.t==='coal') coal+=2; else wood+=2; spawnPickupTrail(w.target.x,w.target.y+.55,w.target.z,b.t==='coal'?0x8ea4c4:0xe3ba79,5,player.position.clone().add(new THREE.Vector3(0,1.1,0))); removeBlock(w.target.x,w.target.y,w.target.z); burst(w.target.x,w.target.y+.5,w.target.z,b.t==='coal'?0x454a56:0x8a5a2b,5); updateHUD(); }
        w.target=null; w.workT=1.3+Math.random();
      }
    } else {
      const a=t*.35+idx*1.8,tx=Math.cos(a)*2.3,tz=Math.sin(a)*2.3,dx=tx-w.g.position.x,dz=tz-w.g.position.z,d=Math.hypot(dx,dz)||1;
      w.g.position.x+=dx/d*.7*dt; w.g.position.z+=dz/d*.7*dt;
    }
  });
}

// ============ プレイヤー ============
let pPos=new THREE.Vector3(0,.5,4), pVel={x:0,z:0};
function box(w,h,d,color){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color})); return m; }
function vbox(w,h,d,color,px=0,py=0,pz=0){ const m=box(w,h,d,color); m.position.set(px,py,pz); return m; }
function addVoxelDetails(g,defs){ for(const d of defs){ const m=vbox(d[0],d[1],d[2],d[3],d[4],d[5],d[6]); g.add(m); } }
function buildPlayer(){
  if(player) scene.remove(player);
  player=new THREE.Group();
  const coat=0x365b8f, coat2=0x294a78, skin=0xe7b98c, fur=0xe9edf4, boot=0x20344f;
  const body=box(.54,.62,.34,coat); body.position.y=1.03; player.add(body);
  // 細かいボクセルのジャケット・ベルト・毛皮
  addVoxelDetails(player,[
    [.16,.16,.08,coat2,-.18,1.14,.205],[.16,.16,.08,coat2,.18,1.14,.205],
    [.42,.09,.38,0x6b4b34,0,.82,0],[.5,.1,.38,fur,0,1.34,0]
  ]);
  const head=box(.4,.4,.4,skin); head.position.y=1.56; player.add(head);
  addVoxelDetails(player,[
    [.11,.07,.035,0x1c2430,-.11,1.59,.215],[.11,.07,.035,0x1c2430,.11,1.59,.215],
    [.08,.06,.04,0xbd7559,0,1.49,.22]
  ]);
  const hat=box(.46,.15,.46,0xcf3f4d); hat.position.y=1.82; player.add(hat);
  addVoxelDetails(player,[[.18,.1,.5,0xe9edf4,0,1.77,0],[.18,.18,.18,0xe9edf4,.17,1.95,0]]);
  limbs.armL=box(.17,.56,.17,coat); limbs.armL.position.set(-.36,1.28,0); limbs.armL.geometry.translate(0,-.24,0); player.add(limbs.armL);
  limbs.armR=box(.17,.56,.17,coat); limbs.armR.position.set(.36,1.28,0); limbs.armR.geometry.translate(0,-.24,0); player.add(limbs.armR);
  addVoxelDetails(limbs.armL,[[.19,.12,.19,fur,0,-.48,0]]); addVoxelDetails(limbs.armR,[[.19,.12,.19,fur,0,-.48,0]]);
  limbs.legL=box(.19,.58,.19,boot); limbs.legL.position.set(-.14,.6,0); limbs.legL.geometry.translate(0,-.29,0); player.add(limbs.legL);
  limbs.legR=box(.19,.58,.19,boot); limbs.legR.position.set(.14,.6,0); limbs.legR.geometry.translate(0,-.29,0); player.add(limbs.legR);
  scene.add(player);
}

