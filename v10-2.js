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
function baseUpgradeCost(){ return baseLevel===1?{wood:70,coal:20,iron:0}:baseLevel===2?{wood:110,coal:45,iron:0}:baseLevel===3?{wood:150,coal:65,iron:20}:baseLevel===4?{wood:210,coal:90,iron:45}:{wood:999,coal:999,iron:999}; }
function baseLevelName(){ return baseLevel===1?'焚き火':baseLevel===2?'炉付きキャンプ':baseLevel===3?'防衛集落':baseLevel===4?'要塞拠点':'極寒要塞'; }
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
  if(baseLevel>=5 && !fireGroup.userData.crown){
    const g=new THREE.Group();
    for(let i=0;i<4;i++){ const p=box(.16,1.25,.16,0xd6ecff); const a=i/4*Math.PI*2; p.position.set(Math.cos(a)*1.0,2.0,Math.sin(a)*1.0); g.add(p); }
    const crown=box(2.35,.18,2.35,0xffd979); crown.position.y=2.72; g.add(crown);
    fireGroup.add(g); fireGroup.userData.crown=g;
  }
}
function upgradeBase(){
  if(baseLevel>=5) return false;
  const c=baseUpgradeCost(); if(wood<c.wood||coal<c.coal||iron<c.iron) return false;
  wood-=c.wood; coal-=c.coal; iron-=c.iron; baseLevel++; baseUpgradeProgress=0;
  baseMax+=120; baseHP=baseMax; fuel=Math.min(100,fuel+35);
  moveSpeed*=1.04; playerDmg=Math.round(playerDmg*1.08);
  if(baseLevel>=2) { ensureWorkers(); wood+=20; }
  if(baseLevel>=3) { warehouseBonus+=25; coal+=15; }
  refreshBaseVisual(); updateCampVisual(); updateHUD();
  sfx('base'); showWaveBanner('🏰 BASE Lv.'+baseLevel,baseLevelName()+' / 新エリア解放');
  worldPop('拠点 Lv.'+baseLevel,new THREE.Vector3(0,3.2,0),'#ffd98b');
  return true;
}
function updateBaseUpgrade(dt){
  if(phase!=='day'||baseLevel>=5) return;
  const d=Math.hypot(pPos.x,pPos.z); if(d>2.8){ baseUpgradeProgress=0; return; }
  const c=baseUpgradeCost();
  if(wood>=c.wood&&coal>=c.coal&&iron>=c.iron){ baseUpgradeProgress+=dt; if(baseUpgradeProgress>.65) upgradeBase(); }
  else baseUpgradeProgress=0;
}
function updateBaseLabel(){
  ensureBaseLabel();
  if(baseLevel>=5){ baseLabelEl.innerHTML='🏰 '+baseLevelName()+' Lv.MAX'; }
  else { const c=baseUpgradeCost(), ready=wood>=c.wood&&coal>=c.coal; baseLabelEl.className='baseWorldLabel'+(ready?' ready':''); baseLabelEl.innerHTML='🏰 '+baseLevelName()+' Lv.'+baseLevel+' → '+(baseLevel+1)+'<span class="cost">🌲'+c.wood+'　🪨'+c.coal+(c.iron?'　⚙️'+c.iron:'')+'</span>'; }
  projectLabel(baseLabelEl,new THREE.Vector3(0,3.05,0),phase==='day'&&Math.hypot(pPos.x,pPos.z)<8.5);
}

