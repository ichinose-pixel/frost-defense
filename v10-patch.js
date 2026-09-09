(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .worldLabel,.baseWorldLabel{display:none!important}
    #joyZone{display:none!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    canvas{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;touch-action:none!important;-webkit-tap-highlight-color:transparent!important}
    #hud{position:fixed!important;top:calc(8px + env(safe-area-inset-top))!important;left:8px!important;right:8px!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;z-index:40!important;max-width:520px!important;margin:0 auto!important;padding:0!important;pointer-events:none!important}
    #hud.hidden{display:none!important}
    #hud:not(.hidden){display:grid!important}
    .chip{background:rgba(8,24,45,.94)!important;border:1px solid rgba(255,220,145,.38)!important;border-radius:11px!important;padding:6px 7px!important;color:#fff!important;font-size:clamp(10px,2.7vw,13px)!important;font-weight:900!important;box-shadow:0 4px 12px rgba(0,0,0,.24)!important;text-align:center!important;white-space:nowrap!important;min-width:0!important}
    #phaseBar{top:calc(94px + env(safe-area-inset-top))!important}
    #baseBadge{display:none!important}
    .groundHud{position:fixed;z-index:22;pointer-events:none;transform:translate(-50%,-50%);min-width:90px;padding:5px 9px;border-radius:999px;background:rgba(4,15,29,.9);border:2px solid #ffd36b;color:#fff;font-size:11px;font-weight:1000;line-height:1.12;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.38);text-align:center;text-shadow:0 1px 2px #000}
    .groundHud .cost{display:block;margin-top:2px;font-size:10px;color:#ffd98b}
    .groundHud.ready{box-shadow:0 0 16px rgba(92,255,151,.68);border-color:#78f3aa;animation:fdPulse .72s ease-in-out infinite alternate}
    .groundHud.locked{opacity:.55}
    @keyframes fdPulse{to{transform:translate(-50%,-50%) scale(1.06)}}
  `;
  document.head.appendChild(style);

  // ---- 水色バグ対策: 画面下半分を覆う透明DOMを完全撤去し、canvasで直接入力 ----
  const joy=$('joyZone'); if(joy) joy.style.display='none';
  function beginCanvasJoy(e){
    try{
      if(!running||e.clientY<innerHeight*.34||joyId!==null) return;
      e.preventDefault(); joyId=e.pointerId; renderer.domElement.setPointerCapture?.(e.pointerId);
      joyBase.style.display=joyKnob.style.display='block';
      joyBase._ox=e.clientX; joyBase._oy=e.clientY;
      joyBase.style.left=(e.clientX-62)+'px'; joyBase.style.top=(e.clientY-62)+'px';
      joyKnob.style.left=(e.clientX-27)+'px'; joyKnob.style.top=(e.clientY-27)+'px';
    }catch(_){ }
  }
  renderer.domElement.addEventListener('pointerdown',beginCanvasJoy,{passive:false});

  // ---- HUDをブラウザ/スマホで必ず表示 ----
  $('startBtn')?.addEventListener('click',()=>setTimeout(()=>{const h=$('hud');if(h){h.classList.remove('hidden');h.style.display='grid';}updateHUD?.();},0));
  function hudWatch(){try{if(running){const h=$('hud');if(h){h.classList.remove('hidden');h.style.display='grid';}}}catch(_){}requestAnimationFrame(hudWatch)}
  requestAnimationFrame(hudWatch);

  // ---- 地面UI ----
  let fdTags=[];
  makeGroundTag=function(title,sub='',accent='#ffd36b'){
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.RingGeometry(.72,1.04,40),new THREE.MeshBasicMaterial({color:new THREE.Color(accent),side:THREE.DoubleSide,depthWrite:true,depthTest:true}));
    ring.rotation.x=-Math.PI/2; ring.position.y=.09; g.add(ring);
    const el=document.createElement('div'); el.className='groundHud'; document.body.appendChild(el);
    g.userData={el,ring,last:'',accent}; scene.add(g); fdTags.push(g); groundTagMeshes.push(g); setGroundTag(g,title,sub,accent); return g;
  };
  setGroundTag=function(g,title,sub='',accent='#ffd36b'){
    if(!g?.userData)return;const sig=title+'|'+sub+'|'+accent;if(g.userData.last===sig)return;g.userData.last=sig;
    g.userData.el.innerHTML=title+(sub?'<span class="cost">'+sub+'</span>':'');g.userData.el.style.borderColor=accent;g.userData.ring?.material?.color.set(accent);
  };
  clearGroundTags=function(){[...groundTagMeshes].forEach(g=>{g?.userData?.el?.remove();if(g?.parent)scene.remove(g)});groundTagMeshes=[];fdTags=[]};
  function projectGroundTags(){for(const g of fdTags){const el=g.userData?.el;if(!el)continue;const v=g.position.clone().project(camera);const on=v.z>-1&&v.z<1&&v.x>-1.1&&v.x<1.1&&v.y>-1.05&&v.y<1.05;el.style.display=on?'block':'none';if(!on)continue;el.style.left=((v.x*.5+.5)*innerWidth)+'px';el.style.top=((-v.y*.5+.5)*innerHeight+18)+'px';}}
  const oldUpdateWorldLabels=updateWorldLabels;
  updateWorldLabels=function(){oldUpdateWorldLabels();document.querySelectorAll('.worldLabel,.baseWorldLabel').forEach(el=>el.style.display='none');projectGroundTags();};

  // ---- 破壊後に建築地点を復活させる ----
  const oldRemoveBlock=removeBlock;
  removeBlock=function(x,y,z){
    const k=key(x,y,z),was=defenseState.has(k);oldRemoveBlock(x,y,z);
    if(was){const p=buildPads.find(q=>q.x===x&&q.z===z);if(p){p.built=false;p.constructing=false;p.progress=0;if(p.g)p.g.visible=true;if(p.tag){const c=getBuildCost(p);setGroundTag(p.tag,typeIcon(p.type)+' 再建','🌲'+c.wood+(c.coal?' 🪨'+c.coal:''),'#ffb86b');p.tag.userData.el.className='groundHud ready';}}}
  };

  // ---- 建築演出: 押し出さない / 段階組み上げ ----
  const sites=[];
  function buildColor(type){return type==='flame'?0xff8a55:type==='turret'?0x91d8ff:type==='warehouse'?0xd2aa72:0xd59a5f}
  function startSite(p){
    if(p.built||p.constructing)return false;const c=getBuildCost(p);if(wood<c.wood||coal<c.coal)return false;
    wood-=c.wood;coal-=c.coal;p.constructing=true;p.progress=0;p.g.visible=false;updateHUD();
    const g=new THREE.Group();g.position.set(p.x,0,p.z);scene.add(g);const col=buildColor(p.type);const pieces=[];
    const dims=p.type==='wall'?[[2.7,.18,.42],[.22,1.2,.22],[.22,1.2,.22],[2.55,.18,.3]]:p.type==='turret'?[[1.5,.18,1.5],[.24,1.45,.24],[1.15,.18,1.15],[.7,.22,.24]]:p.type==='flame'?[[1.45,.18,1.45],[.95,.72,.95],[.62,.38,.62],[.22,.7,.22]]:[[1.7,.18,1.4],[1.5,.72,1.18],[1.65,.18,1.32],[.52,.32,.12]];
    dims.forEach((d,i)=>{const m=box(d[0],d[1],d[2],col);m.position.y=.12+i*.4;m.scale.setScalar(.04);g.add(m);pieces.push(m)});
    sites.push({p,g,pieces,t:0,duration:.78});sfx('build');return true;
  }
  function completeSite(s){
    const p=s.p;if(Math.hypot(pPos.x-p.x,pPos.z-p.z)<1.35)return false;
    scene.remove(s.g);const y=1,hp=getDefenseMaxHp(p.type,1);setBlock(p.x,y,p.z,p.type,hp);
    const dtag=p.tag||makeGroundTag(typeIcon(p.type)+' '+typeName(p.type)+' Lv.1','進化可能','#ffd36b');
    defenseState.set(key(p.x,y,p.z),{type:p.type,level:1,hp,maxHp:hp,_progress:0,tag:dtag});refreshDefenseVisual(p.x,y,p.z);
    if(p.type==='warehouse'){warehouseBonus+=40;wood+=12;coal+=6}p.built=true;p.constructing=false;p.progress=0;
    burst(p.x,1,p.z,buildColor(p.type),10);worldPop(typeName(p.type)+' 完成!',new THREE.Vector3(p.x,1.8,p.z),'#ffe19a');toast(typeIcon(p.type)+' '+typeName(p.type)+' 完成!');updateHUD();return true;
  }
  function animateSites(dt){for(let i=sites.length-1;i>=0;i--){const s=sites[i];s.t+=dt;const q=Math.min(1,s.t/s.duration);s.pieces.forEach((m,j)=>{const st=Math.max(0,Math.min(1,(q-j*.16)/.28));const e=1-Math.pow(1-st,3);m.scale.set(e,e,e);m.position.y=.12+j*.4+Math.sin(st*Math.PI)*.06});if(q>=1&&completeSite(s))sites.splice(i,1)}}
  buildFromPad=function(p){return startSite(p)};
  updateBuildPads=function(dt){
    animateSites(dt);
    for(const p of buildPads){if(p.built||p.constructing)continue;p.g.rotation.y+=dt*.35;const d=Math.hypot(p.x-pPos.x,p.z-pPos.z);if(d<1.65){const c=getBuildCost(p);if(wood>=c.wood&&coal>=c.coal){p.progress+=dt;if(p.progress>.36){p.progress=0;startSite(p)}}else{p.progress=0;if(Math.random()<dt*.35)toast(typeIcon(p.type)+' '+typeName(p.type)+' に 🌲'+c.wood+(c.coal?' / 🪨'+c.coal:'')+' 必要')}}else p.progress=0;}
  };

  // ---- 爽快感はカクつかない範囲に抑える ----
  let comboPitch=0,prev=new Map();
  const oldSfx=sfx;sfx=function(name){if(name!=='kill')return oldSfx(name);if(!audioCtx)return;comboPitch=Math.min(8,comboPitch+1);const k=1+comboPitch*.065;tone(220*k,.04,'square',.055,1.8);tone(440*k,.07,'triangle',.04,1.25)};
  function deathWatch(){try{const now=new Set(enemies);for(const[e,pos]of prev){if(!now.has(e)){burst(pos.x,1,pos.z,e.kind==='boss'?0xff8a5b:0xd7e6ff,e.kind==='boss'?18:8);shake=Math.max(shake,e.kind==='boss'?.32:.10)}}const n=new Map();for(const e of enemies)n.set(e,e.model.g.position.clone());prev=n;if(combo===0)comboPitch=0}catch(_){}requestAnimationFrame(deathWatch)}requestAnimationFrame(deathWatch);
})();