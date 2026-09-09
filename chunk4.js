// ============ 更新 ============
function solidAt(x,z){
  // 木柵は見た目の約3マス幅すべてを衝突判定にする（隙間を敵が抜けない）
  for(const [k,st] of defenseState){
    if(st.type!=='wall') continue;
    const [wx,wy,wz]=k.split(',').map(Number); const tangent=Math.abs(wx)>=Math.abs(wz)?'z':'x';
    const along=tangent==='x'?Math.abs(x-wx):Math.abs(z-wz); const across=tangent==='x'?Math.abs(z-wz):Math.abs(x-wx);
    if(along<=1.52&&across<=.48) return blockAt(wx,wy,wz);
  }
  for(let y=1;y<=2;y++){ const b=blockAt(Math.round(x),y,Math.round(z)); if(b&&['wall','turret','flame','warehouse'].includes(b.t)) return b; }
  return null;
}
const PLAYER_RADIUS=.34;
function playerCollidesAt(x,z){
  // 防壁は3マス幅の長方形として扱い、プレイヤー半径分だけ膨らませる。
  for(const [k,st] of defenseState){
    const [ox,oy,oz]=k.split(',').map(Number);
    if(st.type==='wall'){
      const tangent=Math.abs(ox)>=Math.abs(oz)?'z':'x';
      const halfLong=1.52+PLAYER_RADIUS, halfShort=.48+PLAYER_RADIUS;
      const along=tangent==='x'?Math.abs(x-ox):Math.abs(z-oz);
      const across=tangent==='x'?Math.abs(z-oz):Math.abs(x-ox);
      if(along<halfLong && across<halfShort) return true;
    } else {
      const r=(st.type==='warehouse'?1.05:.72)+PLAYER_RADIUS;
      if(Math.hypot(x-ox,z-oz)<r) return true;
    }
  }
  return false;
}
function nearestFreePosition(x,z){
  if(!playerCollidesAt(x,z)) return {x,z};
  // 既に挟まれた状態でも、最も近い空き地点へ救済する。
  for(let radius=.35; radius<=3.5; radius+=.25){
    const steps=Math.max(12,Math.ceil(radius*18));
    for(let i=0;i<steps;i++){
      const a=i/steps*Math.PI*2;
      const nx=x+Math.cos(a)*radius, nz=z+Math.sin(a)*radius;
      if(Math.max(Math.abs(nx),Math.abs(nz))>R_INNER-.45) continue;
      if(!playerCollidesAt(nx,nz)) return {x:nx,z:nz};
    }
  }
  return {x:0,z:4};
}
function movePlayerWithCollision(dx,dz){
  const lim=R_INNER-.45;
  const sx=pPos.x, sz=pPos.z;
  const tx=Math.max(-lim,Math.min(lim,sx+dx));
  const tz=Math.max(-lim,Math.min(lim,sz+dz));
  // 斜め移動 → Xだけ → Zだけ の順で試すことで壁沿いに滑る。
  if(!playerCollidesAt(tx,tz)){ pPos.x=tx; pPos.z=tz; return; }
  if(!playerCollidesAt(tx,sz)){ pPos.x=tx; return; }
  if(!playerCollidesAt(sx,tz)){ pPos.z=tz; return; }
  // それでも現在位置が衝突中なら安全地点へ救済。
  if(playerCollidesAt(pPos.x,pPos.z)){
    const safe=nearestFreePosition(pPos.x,pPos.z); pPos.x=safe.x; pPos.z=safe.z;
  }
}
function resolvePlayerCollision(){
  if(playerCollidesAt(pPos.x,pPos.z)){
    const safe=nearestFreePosition(pPos.x,pPos.z); pPos.x=safe.x; pPos.z=safe.z;
  }
}
function projectLabel(el,pos,visible=true){
  if(!el) return; const v=pos.clone().project(camera); const on=visible&&v.z>-1&&v.z<1&&v.x>-1.15&&v.x<1.15&&v.y>-1.15&&v.y<1.15;
  el.style.display=on?'block':'none'; if(!on) return; el.style.left=((v.x*.5+.5)*innerWidth)+'px'; el.style.top=((-v.y*.5+.5)*innerHeight)+'px';
}
function updateWorldLabels(){
  for(const p of buildPads){
    if(!p.labelEl) continue;
    if(p.built){ p.labelEl.style.display='none'; continue; }
    const c=getBuildCost(p), unlocked=baseLevel>=requiredBaseLevel(p.type), ready=unlocked&&wood>=c.wood&&coal>=c.coal;
    p.labelEl.className='worldLabel '+(ready?'ready':'locked');
    p.labelEl.innerHTML=unlocked?(typeIcon(p.type)+' '+typeName(p.type)+'<span class="cost">🌲'+c.wood+(c.coal?'　🪨'+c.coal:'')+'</span>'):('🔒 '+typeName(p.type)+'<span class="cost">拠点Lv.'+requiredBaseLevel(p.type)+'</span>');
    projectLabel(p.labelEl,new THREE.Vector3(p.x,2.25,p.z),phase==='day'&&pPos.distanceTo(new THREE.Vector3(p.x,.5,p.z))<8.5);
  }
  defenseState.forEach((st,k)=>{
    let el=defenseLabelEls.get(k); if(!el){ el=makeWorldLabel(); defenseLabelEls.set(k,el); }
    const [x,y,z]=k.split(',').map(Number); if(st.level>=MAX_DEF_LV){ el.innerHTML=typeIcon(st.type)+' '+typeName(st.type)+' Lv.MAX'; el.className='worldLabel ready'; }
    else { const c=getUpgradeCost(st), ready=wood>=c.wood&&coal>=c.coal; el.className='worldLabel '+(ready?'ready':'locked'); el.innerHTML=typeIcon(st.type)+' '+typeName(st.type)+' Lv.'+st.level+' → '+(st.level+1)+'<span class="cost">🌲'+c.wood+(c.coal?'　🪨'+c.coal:'')+'</span>'; }
    const dist=Math.hypot(x-pPos.x,z-pPos.z); projectLabel(el,new THREE.Vector3(x,2.55,z),phase==='day'&&dist<8.5);
  });
}
function countBlocksOfType(types){ let n=0; for(const [,b] of blocks){ if(types.includes(b.t)) n++; } return n; }
function spawnResourceNode(type){
  for(let guard=0; guard<120; guard++){
    const x=(Math.random()*2-1)*(R_INNER-3)|0, z=(Math.random()*2-1)*(R_INNER-3)|0;
    if(Math.max(Math.abs(x),Math.abs(z))<7) continue;
    if(blockAt(x,1,z)||blockAt(x,2,z)||blockAt(x,3,z)) continue;
    if(type==='tree'){
      for(let y=1;y<=3;y++) blocks.set(key(x,y,z),{t:'wood',hp:0});
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) if(!blockAt(x+dx,4,z+dz)) blocks.set(key(x+dx,4,z+dz),{t:'leaf',hp:0});
      blocks.set(key(x,5,z),{t:'leaf',hp:0});
    } else {
      blocks.set(key(x,1,z),{t:'coal',hp:0});
      if(Math.random()<.7&&!blockAt(x,2,z)) blocks.set(key(x,2,z),{t:'coal',hp:0});
      if(Math.random()<.35&&!blockAt(x+1,1,z)) blocks.set(key(x+1,1,z),{t:'coal',hp:0});
    }
    rebuild();
    return true;
  }
  return false;
}
function updateResourceRespawn(dt){
  resourceRespawnT-=dt;
  if(resourceRespawnT>0||phase!=='day') return;
  resourceRespawnT=6.5;
  if(countBlocksOfType(['wood','leaf'])<95) spawnResourceNode('tree');
  if(countBlocksOfType(['coal'])<28) spawnResourceNode('coal');
}
function harvestCluster(x,y,z,type){
  let woodGain=0, coalGain=0, removed=[];
  if(type==='coal'){
    for(let dx=0;dx<=1;dx++) for(let dy=1;dy<=2;dy++){
      const b=blockAt(x+dx,dy,z); if(b&&b.t==='coal') removed.push([x+dx,dy,z,b]);
    }
  }else{
    for(let dy=1;dy<=5;dy++){ const b=blockAt(x,dy,z); if(b&&(b.t==='wood'||b.t==='leaf')) removed.push([x,dy,z,b]); }
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){ const b=blockAt(x+dx,4,z+dz); if(b&&b.t==='leaf') removed.push([x+dx,4,z+dz,b]); }
  }
  const uniq=[]; const seen=new Set();
  for(const r of removed){ const k=r[0]+','+r[1]+','+r[2]; if(!seen.has(k)){ seen.add(k); uniq.push(r);} }
  if(!uniq.length) return false;
  for(const [rx,ry,rz,b] of uniq){
    if(b.t==='coal') coalGain+=2; else woodGain += (b.t==='wood'?2:1);
    removeBlock(rx,ry,rz);
    burst(rx,ry+.5,rz,b.t==='coal'?0x454a56:0x8a5a2b,4);
  }
  if(woodGain){ wood+=woodGain; spawnPickupTrail(x,1.2,z,0xe3ba79,Math.min(16,6+Math.ceil(woodGain/2)),player.position.clone().add(new THREE.Vector3(0,1.1,0))); worldPop('+'+woodGain+' 木材',new THREE.Vector3(x,2.2,z),'#ffd28b'); }
  if(coalGain){ coal+=coalGain; spawnPickupTrail(x,1.2,z,0x8ea4c4,Math.min(14,5+Math.ceil(coalGain/2)),player.position.clone().add(new THREE.Vector3(0,1.1,0))); worldPop('+'+coalGain+' 石炭',new THREE.Vector3(x,2.2,z),'#b8d3ff'); }
  toast(coalGain?('+'+coalGain+' 🪨'):('+'+woodGain+' 🌲'));
  updateHUD();
  return true;
}

function spawnRescueSurvivor(){
  if(rescueNPC||rescueSpawnedForDay===day||day<2) return; rescueSpawnedForDay=day;
  const a=Math.random()*Math.PI*2,r=16+Math.random()*6; const g=new THREE.Group();
  const body=box(.38,.54,.28,0x9a5d58); body.position.y=.9; g.add(body); const head=box(.31,.31,.31,0xe0b187); head.position.y=1.32; g.add(head); const scarf=box(.42,.12,.34,0xffd36b); scarf.position.y=1.14; g.add(scarf);
  g.position.set(Math.cos(a)*r,.5,Math.sin(a)*r); scene.add(g); rescueNPC={g}; worldPop('HELP!',g.position.clone().add(new THREE.Vector3(0,1.8,0)),'#ffe19a');
}
function updateRescue(){
  if(!rescueNPC) return; const d=rescueNPC.g.position.distanceTo(player.position);
  if(d<2.0){ scene.remove(rescueNPC.g); rescueNPC=null; rescued++; makeWorker(workerObjs.length); wood+=20; coal+=8; showWaveBanner('SURVIVOR RESCUED','住民 +1 / 資材ボーナス'); toast('🧑 生存者を救助！住民が増えた'); updateHUD(); }
}
function update(dt,t){
  gameElapsed+=dt;
  // フェーズ
  phaseT-=dt;
  if(phase==='day'){
    temp=-10-(day-1)*3; fuel=Math.min(100,fuel+dt*1.6);
    updateResourceRespawn(dt); spawnRescueSurvivor(); updateRescue();
    if(phaseT<=0){ phase='night'; phaseT=999; waveLeft=14+day*7; spawnT=0; showWaveBanner('🌙 NIGHT '+day,'襲撃開始'); toast('🌙 第'+day+'夜 — 襲撃開始!'); }
  } else {
    temp=-25-(day-1)*4; fuel-=(0.9+day*.12)*fireDrainMul*dt;
    if(waveLeft>0){ spawnT-=dt; if(spawnT<=0){ spawnT=Math.max(.18,.5-day*.03); spawnEnemyPack(); } }
    if(waveLeft<=0&&enemies.length===0&&!upgrading){ showUpgrade(); }
  }
  nightK+= ((phase==='night'?1:0)-nightK)*Math.min(1,dt*1.2);
  // 空
  const sky=new THREE.Color(0xbcd8ee).lerp(new THREE.Color(0x0a1226),nightK);
  scene.background.copy(sky); scene.fog.color.copy(sky);
  sun.intensity=1.15-nightK*.95; hemi.intensity=.9-nightK*.55;
  const sa=(phase==='day'? (1-phaseT/30) : .5)*Math.PI;
  sun.position.set(Math.cos(sa)*30,Math.max(6,Math.sin(sa)*30),10);
  const fr=fuel/100;
  fireLight.intensity=(0.6+fr*2.2)*(1+nightK*.8)+Math.sin(t*11)*.25;
  fireLight.distance=12+fr*12;
  // プレイヤー移動：固定3/4カメラ基準。視点操作は不要。
  let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+joyVec.x;
  let mz=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+joyVec.y;
  const ml=Math.hypot(mx,mz); if(ml>1){mx/=ml;mz/=ml;}
  // 画面の左右・上下をワールド移動へ写像
  const right=new THREE.Vector3(1,0,-CAM_OFFSET.x/CAM_OFFSET.z).normalize();
  const forward=new THREE.Vector3(-CAM_OFFSET.x,0,-CAM_OFFSET.z).normalize();
  const wx=(right.x*mx+forward.x*mz)*moveSpeed, wz=(right.z*mx+forward.z*mz)*moveSpeed;
  movePlayerWithCollision(wx*dt,wz*dt);
  resolvePlayerCollision();
  player.position.copy(pPos);
  gatherRing.position.set(pPos.x,.07,pPos.z);
  attackRing.position.set(pPos.x,.06,pPos.z);
  attackRing.material.opacity=(phase==='night'?.18:.08);
  attackRing.visible=phase==='night';
  if(ml>.08) player.rotation.y=Math.atan2(wx,wz);
  const moving=ml>.15, sw=moving?Math.sin(t*11)*.7:0;
  limbs.legL.rotation.x=sw; limbs.legR.rotation.x=-sw; limbs.armL.rotation.x=-sw*.8; limbs.armR.rotation.x=sw*.8;
  if(shootCD>0) shootCD-=dt;
  if(comboT>0){ comboT-=dt; if(comboT<=0){combo=0;$('combo').style.opacity=0;} }
  // 固定斜め上カメラ。プレイヤーを少し下側に置き、進行方向を広く見せる。
  camLook.lerp(new THREE.Vector3(pPos.x,pPos.y+1.0,pPos.z),Math.min(1,dt*7));
  camera.position.lerp(camLook.clone().add(CAM_OFFSET),Math.min(1,dt*6));
  if(shake>0){ camera.position.x+=(Math.random()-.5)*shake*.07; camera.position.y+=(Math.random()-.5)*shake*.05; shake-=dt*3; }
  camera.lookAt(camLook.x,camLook.y+.1,camLook.z);
  // 射程内の最寄り敵を自動攻撃
  if(phase==='night'&&shootCD<=0&&enemies.length){
    let target=null,bd=7.8;
    for(const e of enemies){ const d=e.model.g.position.distanceTo(player.position); if(d<bd){bd=d;target=e;} }
    if(target){
      shootCD=.42;
      const from=pPos.clone().add(new THREE.Vector3(0,1.35,0));
      const dir=target.model.g.position.clone().add(new THREE.Vector3(0,.8,0)).sub(from).normalize();
      shootArrow(from.clone().add(dir.clone().multiplyScalar(.5)),dir,playerDmg,target);
      player.rotation.y=Math.atan2(dir.x,dir.z); limbs.armR.rotation.x=-1.25;
    }
  }
  // 焚き火に戻るだけで石炭を自動投入
  fuelAutoCD-=dt;
  if(Math.hypot(pPos.x,pPos.z)<2.2&&fuel<78&&coal>=10&&fuelAutoCD<=0){ coal-=10;fuel=Math.min(100,fuel+30);fuelAutoCD=1.2;spawnPickupTrail(player.position.x,1.0,player.position.z,0xffb35c,8,new THREE.Vector3(0,1.0,0));burst(0,1,0,0xffaa44,12);toast('🔥 石炭を自動投入 +30%');updateHUD(); }
  updateBaseUpgrade(dt);
  updateBuildPads(dt);
  updateDefenseUpgrades(dt);
  updateWorkers(dt,t);
  // 採集
  harvestT-=dt;
  if(harvestT<=0){
    harvestT=.25;
    const px=Math.round(pPos.x), pz=Math.round(pPos.z);
    outer: for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let y=1;y<=5;y++){
      const tx=px+dx, tz=pz+dz;
      const b=blockAt(tx,y,tz);
      if(b&&(b.t==='wood'||b.t==='leaf'||b.t==='coal')){
        harvestCluster(tx,y,tz,b.t);
        break outer;
      }
    }
  }
  // 敵
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i], g=e.model.g;
    if(e.hp<=0){
      burst(g.position.x,1,g.position.z,0xff5544,12);
      scene.remove(g); enemies.splice(i,1);
      wood+=4; coal+=2; kills++; combo++; comboT=2.2;
      if(combo>=2){ $('comboN').textContent=combo; $('combo').style.opacity=1; }
      worldPop(combo>=3?combo+' COMBO!':'撃破!',g.position.clone().add(new THREE.Vector3(0,1.7,0)),combo>=3?'#ffe08a':'#ffffff'); toast(combo>=3?'🔥 '+combo+' COMBO!':'撃破! +4🌲 +2🪨'); updateHUD();
      continue;
    }
    e.walkT+=dt*e.sp*3;
    const dx=-g.position.x, dz=-g.position.z, d=Math.hypot(dx,dz);
    g.rotation.y=Math.atan2(dx,dz)-Math.PI/2;
    const legs=e.model.legs; legs.forEach((l,li)=>l.rotation.x=Math.sin(e.walkT+li*Math.PI)*.6);
    if(d<1.8){ // 焚き火攻撃
      e.atkT-=dt;
      if(e.atkT<=0){ e.atkT=.9; baseHP-=e.dmg; fuel=Math.max(0,fuel-e.dmg*.3);
        burst(0,1,0,0xff7733,8); shake=3; flash();
        updateHUD(); }
    } else {
      const nx2=g.position.x+dx/d*e.sp*dt, nz2=g.position.z+dz/d*e.sp*dt;
      const s=solidAt(nx2,nz2);
      if(s){ e.atkT-=dt;
        if(e.atkT<=0){ e.atkT=.9; s.hp-=e.dmg;
          const bk=[...blocks.entries()].find(([k,v])=>v===s);
          if(bk){ const [bx,by,bz]=bk[0].split(',').map(Number); const st=defenseState.get(bk[0]); if(st) st.hp=s.hp; burst(bx,by+.5,bz,0xc49a63,4);
            if(s.hp<=0){ removeBlock(bx,by,bz); burst(bx,by+.5,bz,0x888888,14); toast('🧱 防衛オブジェクトが破壊された!'); } }
        }
      } else { g.position.x=nx2; g.position.z=nz2; }
    }
    e.bar.scale.x=Math.max(.01,e.hp/e.max);
    e.bar.position.x=-(1-e.hp/e.max)*.4*Math.cos(g.rotation.y)*0; // シンプルに左寄せは省略
  }
  // 矢塔
  for(const [k,g] of turretObjs){
    const [tx,ty,tz]=k.split(',').map(Number);
    const st=defenseState.get(k); const lv=st?st.level:1;
    const range=T_RANGE+(lv-1)*2.1, rate=Math.max(.34,T_RATE-(lv-1)*.12), dmg=Math.round(turretDmg*(1+(lv-1)*.55));
    g._cd=(g._cd||0)-dt;
    if(g._cd>0) continue;
    let best=null,bd=1e9;
    for(const e of enemies){ const d=g.position.distanceTo(e.model.g.position); if(d<range&&d<bd){bd=d;best=e;} }
    if(best){ g._cd=rate;
      const from=new THREE.Vector3(tx,ty+2.1,tz);
      const dir=best.model.g.position.clone().add(new THREE.Vector3(0,.8,0)).sub(from).normalize();
      shootArrow(from,dir,dmg,best);
    }
  }
  // 火炎塔：短射程の範囲攻撃
  for(const [k,g] of flameObjs){
    const st=defenseState.get(k); if(!st) continue; const [x,y,z]=k.split(',').map(Number); const lv=st.level; g._cd=(g._cd||0)-dt; if(g._cd>0) continue;
    const range=4.2+lv*.65; const targets=enemies.filter(e=>Math.hypot(e.model.g.position.x-x,e.model.g.position.z-z)<range);
    if(targets.length){ g._cd=Math.max(.55,1.15-lv*.18); for(const e of targets.slice(0,3+lv)){ e.hp-=10+lv*9; burst(e.model.g.position.x,.8,e.model.g.position.z,0xff6b38,4); } burst(x,1.5,z,0xff8a42,10); }
  }
  // 矢
  for(let i=arrows.length-1;i>=0;i--){
    const a=arrows[i];
    a.life-=dt;
    if(a.home&&a.home.hp>0){ const dir=a.home.model.g.position.clone().add(new THREE.Vector3(0,.8,0)).sub(a.m.position).normalize(); a.v.lerp(dir.multiplyScalar(30),.25); }
    a.v.y-= (a.home?0:4)*dt;
    a.m.position.add(a.v.clone().multiplyScalar(dt));
    a.m.lookAt(a.m.position.clone().add(a.v));
    let dead=a.life<=0||a.m.position.y<0;
    if(!dead) for(const e of enemies){
      if(a.m.position.distanceTo(e.model.g.position.clone().add(new THREE.Vector3(0,.8,0)))<.8){
        e.hp-=a.dmg; burst(a.m.position.x,a.m.position.y,a.m.position.z,0xffe08a,3); dead=true; break;
      }
    }
    if(!dead&&a.m.position.y<4){ const c=blockAt(Math.round(a.m.position.x),Math.round(a.m.position.y),Math.round(a.m.position.z)); if(c) dead=true; }
    if(dead){ scene.remove(a.m); arrows.splice(i,1); }
  }
  // ゴースト
  if(mode===1||mode===2){
    const c=aimCell();
    if(c&&Math.max(Math.abs(c.x),Math.abs(c.z))<=R_INNER){
      const y=mode===1?Math.max(1,Math.min(3,c.y)):1;
      ghost.position.set(c.x,y,c.z); ghost.visible=true;
      const ok=!blockAt(c.x,y,c.z)&&wood>=COST[mode===1?'wall':'turret']&&(mode===1||y===1);
      ghost.material.color.setHex(ok?0x66ff88:0xff5555);
    } else ghost.visible=false;
  } else ghost.visible=false;
  updateWorldLabels();
  updateObjective();
  // 敗北判定
  if(fuel<=0||baseHP<=0) gameOver(fuel<=0);
}


function showUpgrade(){
  upgrading=true; running=false;
  const pool=[
    {icon:'🏹',name:'自動射撃強化',desc:'自動攻撃ダメージ +20%',apply:()=>playerDmg=Math.round(playerDmg*1.2)},
    {icon:'👢',name:'雪上ブーツ',desc:'移動速度 +12%',apply:()=>moveSpeed*=1.12},
    {icon:'🗼',name:'矢塔改良',desc:'矢塔ダメージ +30%',apply:()=>turretDmg=Math.round(turretDmg*1.3)},
    {icon:'🔥',name:'断熱炉',desc:'夜の燃料消費 -15%',apply:()=>fireDrainMul*=.85},
    {icon:'🧱',name:'補給物資',desc:'木材 +55 / 石炭 +20',apply:()=>{wood+=55;coal+=20}},
    {icon:'🏰',name:'要塞改修',desc:'全防衛設備を1段階強化',apply:()=>defenseState.forEach(st=>{ if(st.level<MAX_DEF_LV){ st.level++; st.maxHp=getDefenseMaxHp(st.type,st.level); st.hp=st.maxHp; }})},
    {icon:'❤️',name:'拠点補修',desc:'拠点耐久を全回復',apply:()=>baseHP=baseMax}
  ];
  pool.sort(()=>Math.random()-.5); const picks=pool.slice(0,3);
  const wrap=$('upgradeCards'); wrap.innerHTML='';
  picks.forEach(u=>{ const b=document.createElement('button'); b.className='upCard'; b.innerHTML=`<div style="font-size:30px">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span>`; b.onclick=()=>{u.apply(); defenseState.forEach((st,k)=>{ const [x,y,z]=k.split(',').map(Number); const blk=blockAt(x,y,z); if(blk){ blk.hp=st.hp=st.maxHp=getDefenseMaxHp(st.type,st.level); } refreshDefenseVisual(x,y,z); }); $('upgrade').classList.add('hidden'); day++; phase='day'; phaseT=20; wood+=24+Math.floor(warehouseBonus*.35); coal+=10+Math.floor(warehouseBonus*.12); resourceRespawnT=2.5; upgrading=false; updateCampVisual(); refreshBaseVisual(); ensureWorkers(); running=true; updateHUD(); showWaveBanner('☀️ DAY '+day,'キャンプ拡張'); toast('☀️ Day '+day+' — キャンプが成長した!');}; wrap.appendChild(b); });
  $('upgrade').classList.remove('hidden');
}

function updateObjective(){
  const pct=phase==='day'?Math.max(0,Math.min(100,phaseT/(day===1?24:20)*100)):Math.max(0,Math.min(100,fuel));
  $('phaseFill').style.width=pct+'%';
}

