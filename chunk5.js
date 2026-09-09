// ============ パーティクル更新 ============
function updateParticles(dt){
  const fp=flamePts.geometry.attributes.position.array, fr=fuel/100;
  flameData.forEach((p,i)=>{
    p.life+=dt*1.6; if(p.life>1) p.life=0;
    const s=p.life;
    fp[i*3]=Math.sin(i*7+s*9)*.25*(1-s);
    fp[i*3+1]=.7+s*1.3*(0.4+fr);
    fp[i*3+2]=Math.cos(i*5+s*8)*.25*(1-s);
  });
  flamePts.geometry.attributes.position.needsUpdate=true;
  flamePts.material.size=.2+fr*.25;
  flamePts.visible=fuel>0;
  const sp=snowPts.geometry.attributes.position.array;
  snowData.forEach((p,i)=>{
    p.y-=p.v*dt*(1+nightK*.5); p.x+=Math.sin(p.y*.5)*dt*.5;
    if(p.y<0){p.y=18;p.x=(Math.random()*2-1)*26;p.z=(Math.random()*2-1)*26;}
    sp[i*3]=p.x; sp[i*3+1]=p.y; sp[i*3+2]=p.z;
  });
  snowPts.geometry.attributes.position.needsUpdate=true;
  const dp=debrisPts.geometry.attributes.position.array, dc=debrisPts.geometry.attributes.color.array;
  debrisData.forEach((d,i)=>{
    if(d.life>0){ d.life-=dt; d.vy-=9*dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.z+=d.vz*dt; }
    dp[i*3]=d.x; dp[i*3+1]=d.life>0?d.y:-99; dp[i*3+2]=d.z;
    dc[i*3]=d.r; dc[i*3+1]=d.g; dc[i*3+2]=d.b;
  });
  debrisPts.geometry.attributes.position.needsUpdate=true;
  debrisPts.geometry.attributes.color.needsUpdate=true;
  for(let i=flyPickups.length-1;i>=0;i--){
    const p=flyPickups[i];
    p.life-=dt;
    const dir=p.target.clone().sub(p.pos); const d=Math.max(.001,dir.length());
    dir.normalize();
    p.vel.lerp(dir.multiplyScalar(8+d*1.6),Math.min(1,dt*7));
    p.pos.add(p.vel.clone().multiplyScalar(dt));
    const cube=box(p.size,p.size,p.size,p.color);
    cube.position.copy(p.pos); scene.add(cube);
    setTimeout(()=>scene.remove(cube),34);
    if(p.life<=0||d<.38) flyPickups.splice(i,1);
  }
}

// ============ UI ============
function updateHUD(){
  $('wood').textContent=wood|0; $('coal').textContent=coal|0;
  $('day').textContent=day; $('phase').textContent=phase==='day'?'🌞':'⚔️';
  $('temp').textContent=temp; $('fire').textContent=Math.max(0,fuel|0);
  $('base').textContent=Math.max(0,(baseHP/baseMax*100)|0); $('baseLv').textContent=baseLevel; $('baseBadge').innerHTML='🏰 拠点 <span>Lv.'+baseLevel+'</span>'; 
  document.querySelectorAll('.mchip').forEach(c=>{
    const m=+c.dataset.m;
    c.classList.toggle('dis',(m===1&&wood<COST.wall)||(m===2&&wood<COST.turret));
  });
}
function toast(msg){ const t=$('toast'); t.textContent=msg; t.style.opacity=1;
  clearTimeout(t._tm); t._tm=setTimeout(()=>t.style.opacity=0,1800); }
function flash(){ const f=$('flash'); f.style.opacity=1; setTimeout(()=>f.style.opacity=0,180); }
function gameOver(froze){
  if(!running) return; running=false;
  $('goTitle').textContent=froze?'🧊 焚き火が消えた…':'☠️ 拠点が陥落…';
  $('goSub').textContent='生存記録:'+day+'日目';
  $('goStat').textContent='移動ルートとキャンプ育成が勝敗を分ける。もう一度挑戦しよう。';
  $('gameover').classList.remove('hidden');
}

// ============ メイン ============
let waveLeft=0, spawnT=0;
function startGame(){
  wood=90; coal=36; fuel=100; baseMax=300; baseHP=300; baseLevel=1; baseUpgradeProgress=0; day=1; phase='day'; phaseT=24; nightK=0; moveSpeed=6.0; playerDmg=16; turretDmg=10; fireDrainMul=1; combo=0; kills=0; upgrading=false; fuelAutoCD=0; flyPickups=[]; resourceRespawnT=6; warehouseBonus=0; rescued=0; rescueSpawnedForDay=0; gameElapsed=0; if(rescueNPC){scene.remove(rescueNPC.g);rescueNPC=null;} if(baseLabelEl){baseLabelEl.remove();baseLabelEl=null;} fireGroup.userData={};
  enemies.forEach(e=>scene.remove(e.model.g)); enemies=[];
  arrows.forEach(a=>scene.remove(a.m)); arrows=[];
  pPos.set(0,.5,4); yaw=0; camLook.set(0,1,4);
  clearCampExtras(); buildTerrain(); buildPlayer(); addBuildPads(); updateCampVisual(); refreshBaseVisual(); ensureWorkers();
  running=true; updateHUD();
  showWaveBanner('☀️ DAY 1','');
  toast('移動だけで採集・建築・防衛');
}
initScene(); bindCanvasLook();
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
(function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,clock.getDelta()), t=clock.elapsedTime;
  if(running) update(dt,t);
  updateParticles(dt);
  renderer.render(scene,camera);
})();
$('startBtn').addEventListener('click',()=>{
  $('title').classList.add('hidden');
  ['hud','phaseBar','baseBadge'].forEach(id=>$(id).classList.remove('hidden'));
  startGame();
});
$('retryBtn').addEventListener('click',()=>{ $('gameover').classList.add('hidden'); startGame(); });

// テスト用フック
window.G={get s(){return {day,phase,wood,coal,fuel:Math.round(fuel),baseHP:Math.round(baseHP),enemies:enemies.length,blocks:blocks.size,arrows:arrows.length,turrets:turretObjs.size,defenses:defenseState.size,rescued,warehouseBonus,baseLevel}},
  forceNight(){phase='night';waveLeft=10+day*6;spawnT=0},
  win(){waveLeft=0;enemies.forEach(e=>scene.remove(e.model.g));enemies=[]},
  setMode,doAction,addFuel};

