(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .worldLabel,.baseWorldLabel{display:none!important}
    .groundHud{position:fixed;z-index:13;pointer-events:none;transform:translate(-50%,-50%);min-width:78px;padding:5px 8px;border-radius:10px;background:rgba(5,16,31,.86);border:2px solid #ffd36b;color:#fff;font-size:11px;font-weight:900;line-height:1.15;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.38);text-align:center;text-shadow:0 1px 2px #000}
    .groundHud .cost{display:block;margin-top:2px;font-size:10px;color:#ffd98b}
    .groundHud.ready{box-shadow:0 0 16px rgba(92,255,151,.68);border-color:#78f3aa;animation:fdPulse .72s ease-in-out infinite alternate}
    .groundHud.locked{opacity:.55}
    @keyframes fdPulse{to{transform:translate(-50%,-50%) scale(1.08)}}
    #joyZone{background:transparent!important;box-shadow:none!important;backdrop-filter:none!important}
  `;
  document.head.appendChild(style);

  let fdTags=[];
  let comboPitchV10=0;

  makeGroundTag=function(title,sub='',accent='#ffd36b',w=2.8,h=.82){
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.RingGeometry(.72,1.02,40),new THREE.MeshBasicMaterial({color:new THREE.Color(accent),side:THREE.DoubleSide,depthWrite:true,depthTest:true}));
    ring.rotation.x=-Math.PI/2; ring.position.y=.085; g.add(ring);
    const el=document.createElement('div'); el.className='groundHud'; document.body.appendChild(el);
    g.userData={el,ring,last:'',accent};
    scene.add(g); fdTags.push(g); groundTagMeshes.push(g);
    setGroundTag(g,title,sub,accent); return g;
  };
  setGroundTag=function(g,title,sub='',accent='#ffd36b'){
    if(!g||!g.userData) return;
    const sig=title+'|'+sub+'|'+accent; if(g.userData.last===sig)return; g.userData.last=sig;
    const el=g.userData.el; if(!el)return;
    el.innerHTML=title+(sub?'<span class="cost">'+sub+'</span>':'');
    el.style.borderColor=accent; g.userData.ring?.material?.color.set(accent);
  };
  clearGroundTags=function(){
    [...groundTagMeshes].forEach(g=>{g?.userData?.el?.remove(); if(g?.parent)scene.remove(g)});
    groundTagMeshes=[]; fdTags=[];
  };
  function projectGroundTags(){
    for(const g of fdTags){
      const el=g.userData?.el; if(!el)continue;
      const v=g.position.clone().project(camera); const on=v.z>-1&&v.z<1&&v.x>-1.1&&v.x<1.1&&v.y>-1.05&&v.y<1.05;
      el.style.display=on?'block':'none'; if(!on)continue;
      el.style.left=((v.x*.5+.5)*innerWidth)+'px'; el.style.top=((-v.y*.5+.5)*innerHeight)+'px';
    }
  }
  const oldUpdateWorldLabels=updateWorldLabels;
  updateWorldLabels=function(){
    oldUpdateWorldLabels();
    document.querySelectorAll('.worldLabel,.baseWorldLabel').forEach(el=>el.style.display='none');
    for(const p of buildPads){ if(p.tag?.userData?.el){ const c=getBuildCost(p),unlocked=baseLevel>=requiredBaseLevel(p.type),ready=unlocked&&wood>=c.wood&&coal>=c.coal; p.tag.userData.el.className='groundHud '+(ready?'ready':(unlocked?'':'locked')); } }
    defenseState.forEach(st=>{if(st.tag?.userData?.el){const c=getUpgradeCost(st),ready=st.level<MAX_DEF_LV&&wood>=c.wood&&coal>=c.coal;st.tag.userData.el.className='groundHud '+(ready?'ready':'');}});
    projectGroundTags();
  };

  function juice(x,y,z,color,count=12,target=null){
    for(let i=0;i<count;i++){
      const m=box(.10+Math.random()*.09,.10+Math.random()*.09,.10+Math.random()*.09,color);
      m.position.set(x+(Math.random()-.5)*.7,y+(Math.random()-.5)*.45,z+(Math.random()-.5)*.7); scene.add(m);
      const v=new THREE.Vector3((Math.random()-.5)*4,2+Math.random()*3,(Math.random()-.5)*4); let age=0;
      const life=.55+Math.random()*.35;
      (function tick(){
        const dt=.016; age+=dt;
        if(target&&age>.16){const d=target.clone().sub(m.position);v.lerp(d.normalize().multiplyScalar(9+Math.min(8,d.length())),.12);}else v.y-=8*dt;
        m.position.addScaledVector(v,dt);m.rotation.x+=.14;m.rotation.y+=.2;
        if(age<life && (!target||m.position.distanceTo(target)>.3)) requestAnimationFrame(tick); else scene.remove(m);
      })();
    }
  }

  const oldSfx=sfx;
  sfx=function(name){
    if(name!=='kill') return oldSfx(name);
    if(!audioCtx)return; comboPitchV10=Math.min(10,comboPitchV10+1); const k=1+comboPitchV10*.065;
    tone(220*k,.045,'square',.07,1.9); tone(440*k,.08,'triangle',.055,1.25);
  };

  const oldHarvest=harvestCluster;
  harvestCluster=function(x,y,z,type){
    const ok=oldHarvest(x,y,z,type);
    if(ok){const c=type==='coal'?0x667487:0xb8793e;juice(x,y+1,z,c,type==='coal'?10:18,player.position.clone().add(new THREE.Vector3(0,1,0)));shake=Math.max(shake,.16);}
    return ok;
  };
  const oldBuild=buildFromPad;
  buildFromPad=function(p){const ok=oldBuild(p);if(ok){juice(p.x,1.2,p.z,p.type==='flame'?0xff7b45:(p.type==='turret'?0x8ed1ff:0xffc46f),18,null);shake=Math.max(shake,.22);}return ok;};
  const oldUpgrade=upgradeDefense;
  upgradeDefense=function(hit){const ok=oldUpgrade(hit);if(ok){juice(hit.x,1.35,hit.z,hit.state.type==='turret'?0x8ed1ff:0xffd27a,22,null);shake=Math.max(shake,.28);}return ok;};

  let prev=new Map();
  function deathWatcher(){
    try{
      const now=new Set(enemies);
      for(const [e,pos] of prev){ if(!now.has(e)){juice(pos.x,1,pos.z,e.kind==='boss'?0xff8a5b:0xd7e6ff,e.kind==='boss'?26:12,null);shake=Math.max(shake,e.kind==='boss'?.48:.20); if(e.kind==='boss') flashHit();} }
      const next=new Map(); for(const e of enemies) next.set(e,e.model.g.position.clone()); prev=next;
      if(combo===0) comboPitchV10=0;
    }catch(_){ }
    requestAnimationFrame(deathWatcher);
  }
  function flashHit(){const f=$('flash');if(!f)return;f.style.background='radial-gradient(circle,rgba(255,255,255,.08),rgba(255,170,80,.22))';f.style.opacity=.7;setTimeout(()=>{f.style.opacity=0;setTimeout(()=>f.style.background='radial-gradient(circle,transparent 40%,rgba(255,30,30,.45))',180)},50)}
  requestAnimationFrame(deathWatcher);

  const joy=$('joyZone'); if(joy){joy.style.background='transparent';joy.style.webkitBackdropFilter='none';joy.style.backdropFilter='none';}
})();