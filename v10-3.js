// ============ 地面UI / サウンド / 外部拠点 ============
function initAudio(){
  if(audioCtx) return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)(); masterGain=audioCtx.createGain(); masterGain.gain.value=.22; masterGain.connect(audioCtx.destination);
}
function tone(freq=440,dur=.08,type='sine',vol=.13,slide=1){
  if(!audioCtx) return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),audioCtx.currentTime+dur); g.gain.setValueAtTime(vol,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur); o.connect(g); g.connect(masterGain); o.start(); o.stop(audioCtx.currentTime+dur);
}
function sfx(name){
  if(!audioCtx) return; const now=performance.now(); if(lastSfx[name]&&now-lastSfx[name]<45) return; lastSfx[name]=now;
  if(name==='wood'){tone(170,.06,'square',.08,1.8);tone(280,.08,'triangle',.06,1.3)}
  else if(name==='coal'){tone(110,.09,'square',.09,.72);tone(190,.05,'triangle',.05,.8)}
  else if(name==='iron'){tone(520,.05,'triangle',.06,1.3);tone(780,.09,'sine',.05,1.1)}
  else if(name==='build'){tone(180,.09,'square',.08,1.3);setTimeout(()=>tone(330,.12,'triangle',.09,1.45),70)}
  else if(name==='upgrade'){tone(330,.08,'triangle',.08,1.3);setTimeout(()=>tone(520,.1,'triangle',.08,1.25),70);setTimeout(()=>tone(780,.14,'sine',.07,1.05),145)}
  else if(name==='shoot'){tone(760,.035,'square',.025,.72)}
  else if(name==='flame'){tone(125,.12,'sawtooth',.035,.55)}
  else if(name==='kill'){comboPitch=Math.min(8,comboPitch+1);const k=1+comboPitch*.07;tone(210*k,.045,'square',.06,1.9);tone(420*k,.075,'triangle',.05,1.3)}
  else if(name==='wave'){tone(105,.3,'sawtooth',.09,.65);setTimeout(()=>tone(85,.35,'sawtooth',.08,.55),160)}
  else if(name==='base'||name==='capture'||name==='rescue'){tone(392,.1,'triangle',.08,1.2);setTimeout(()=>tone(587,.12,'triangle',.08,1.2),90);setTimeout(()=>tone(784,.18,'sine',.07,1.05),190)}
  else if(name==='boss'){tone(70,.45,'sawtooth',.12,.55);setTimeout(()=>tone(55,.55,'square',.09,.5),240)}
}
function makeGroundTag(title,sub='',accent='#ffd36b',w=2.8,h=.82){
  const el=document.createElement('div'); el.className='groundHud'; document.body.appendChild(el);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.78,1.02,36),new THREE.MeshBasicMaterial({color:new THREE.Color(accent),side:THREE.DoubleSide,depthWrite:true}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.085; scene.add(ring);
  const obj={el,ring,position:new THREE.Vector3(),last:'',accent}; groundTagMeshes.push(obj); setGroundTag(obj,title,sub,accent); return obj;
}
function setGroundTag(m,title,sub='',accent='#ffd36b'){
  if(!m) return; const sig=title+'|'+sub+'|'+accent; if(m.last===sig)return; m.last=sig; m.accent=accent;
  m.el.innerHTML=title+(sub?'<span class="cost">'+sub+'</span>':'');
  const c=new THREE.Color(accent); m.el.style.borderColor=accent; if(m.ring) m.ring.material.color.copy(c);
}
function updateGroundTags(){
  for(const m of groundTagMeshes){
    if(!m?.el) continue;
    const wp=m.position.clone(); if(m.ring){m.ring.position.set(wp.x,.086,wp.z);m.ring.visible=true;}
    const v=wp.clone().project(camera); const visible=v.z>-1&&v.z<1;
    if(!visible){m.el.style.display='none';continue;}
    m.el.style.display='block'; m.el.style.left=((v.x*.5+.5)*innerWidth)+'px'; m.el.style.top=((-v.y*.5+.5)*innerHeight)+'px';
  }
}
function clearGroundTags(){ groundTagMeshes.forEach(m=>{m.el?.remove();if(m.ring)scene.remove(m.ring)}); groundTagMeshes=[]; }
function baseGroundText(){ const c=baseUpgradeCost(); return baseLevel>=5?['🏰 Lv.MAX','DAY 7 BOSS']:['🏰 Lv.'+baseLevel+'→'+(baseLevel+1),'🌲'+c.wood+' 🪨'+c.coal+(c.iron?' ⚙️'+c.iron:'')]; }
let baseGroundTag=null;
function ensureBaseGroundTag(){ if(!baseGroundTag){ baseGroundTag=makeGroundTag('🏰 Lv.1→2','🌲70 🪨20','#ffd36b',3.35,.9); baseGroundTag.position.set(0,.08,2.35); } const t=baseGroundText(); setGroundTag(baseGroundTag,t[0],t[1],'#ffd36b'); }
function outpostInfo(type){
  return type==='sawmill'?{name:'製材所',icon:'🪵',color:0xffc66e,need:2,prod:'🌲 +6'}:
         type==='coalmine'?{name:'炭鉱',icon:'⛏️',color:0xaec8ea,need:2,prod:'🪨 +4'}:
         type==='ironmine'?{name:'鉄鉱山',icon:'⚙️',color:0xcfd8e2,need:3,prod:'⚙️ +2'}:
         type==='survivor'?{name:'生存者キャンプ',icon:'🧑',color:0x9de3a0,need:2,prod:'住民 +1'}:{name:'研究所跡地',icon:'🔬',color:0x9ed7ff,need:4,prod:'全塔 +10%'};
}
function makeOutpostVisual(type,x,z){
  const info=outpostInfo(type),g=new THREE.Group();
  const floor=box(3.0,.12,3.0,0x6e7e8e); floor.position.y=.58; g.add(floor);
  if(type==='sawmill'){ addVoxelDetails(g,[[2.3,.65,1.2,0x8f6339,0,1,0],[2.55,.18,1.45,0x594438,0,1.48,0],[.28,1.05,.28,0xd4ad6d,-.95,1.2,.55],[.28,1.05,.28,0xd4ad6d,.95,1.2,.55],[1.6,.18,.18,0xc98b4e,0,.78,-.85]]); }
  else if(type==='coalmine'||type==='ironmine'){ addVoxelDetails(g,[[2.2,1.55,.5,0x545f6c,0,1.25,0],[.4,1.3,.4,0x9ca9b5,-.88,1.35,0],[.4,1.3,.4,0x9ca9b5,.88,1.35,0],[1.65,.25,.25,type==='ironmine'?0xc9d2da:0x303843,0,.85,.55],[.4,.4,.4,type==='ironmine'?0xd9e2e9:0x252b32,-.55,.85,-.65],[.4,.4,.4,type==='ironmine'?0xaab6c0:0x3a414b,.2,.85,-.7]]); }
  else if(type==='survivor'){ addVoxelDetails(g,[[2.2,.65,1.5,0xb66e48,0,1,0],[2.45,.18,1.7,0xe1b36b,0,1.47,0],[.25,.7,.25,0xffd36b,.8,1.2,.65],[.7,.12,.08,0xfff0a0,.8,1.62,.65]]); }
  else { addVoxelDetails(g,[[2.0,1.3,1.8,0x687b8f,0,1.3,0],[2.3,.22,2.05,0x3c5268,0,2.03,0],[.35,.75,.35,0x9ed7ff,-.55,2.35,0],[.35,.75,.35,0x9ed7ff,.55,2.35,0]]); }
  g.position.set(x,0,z); scene.add(g); return g;
}
function initOutposts(){
  outposts.forEach(o=>{scene.remove(o.g);if(o.tag){o.tag.el?.remove();if(o.tag.ring)scene.remove(o.tag.ring)}}); outposts=[];
  const defs=[['sawmill',-19,-10],['coalmine',19,-9],['ironmine',0,21],['survivor',-18,17],['research',18,17]];
  defs.forEach(([type,x,z])=>{ const info=outpostInfo(type),g=makeOutpostVisual(type,x,z),tag=makeGroundTag(info.icon+' '+info.name,'🔒 拠点Lv.'+info.need,'#8ea6bd',3.25,.88); tag.position.set(x,.08,z+2.15); outposts.push({type,x,z,g,tag,captured:false,hp:240,maxHp:240,progress:0,prodT:0}); });
}
function refreshOutpostTag(o){ const i=outpostInfo(o.type); if(o.captured){setGroundTag(o.tag,i.icon+' '+i.name+' ✓',i.prod+' / HP '+Math.max(0,o.hp|0),'#86f0b1');o.tag.el.className='groundHud';} else if(baseLevel<i.need){setGroundTag(o.tag,i.icon+' '+i.name,'🔒 Lv.'+i.need,'#8ea6bd');o.tag.el.className='groundHud locked';} else {setGroundTag(o.tag,i.icon+' '+i.name,'近づいて確保 / '+i.prod,'#ffd36b');o.tag.el.className='groundHud ready';} }
function updateOutposts(dt){
  for(const o of outposts){ refreshOutpostTag(o); if(phase!=='day')continue; const d=Math.hypot(o.x-pPos.x,o.z-pPos.z);
    if(!o.captured&&baseLevel>=outpostInfo(o.type).need&&d<2.4){ o.progress+=dt; if(o.progress>.7){o.progress=0;o.captured=true;o.hp=o.maxHp;sfx('capture');showWaveBanner('AREA SECURED',outpostInfo(o.type).name+' を確保');if(o.type==='survivor'){rescued++;makeWorker(workerObjs.length);}if(o.type==='research'){turretDmg=Math.round(turretDmg*1.1);playerDmg=Math.round(playerDmg*1.08);} } } else if(!o.captured)o.progress=0;
    if(o.captured){o.prodT-=dt;if(o.prodT<=0){o.prodT=4.2;if(o.type==='sawmill'){wood+=6;sfx('wood')}else if(o.type==='coalmine'){coal+=4;sfx('coal')}else if(o.type==='ironmine'){iron+=2;sfx('iron')} updateHUD();}}
  }
}
function activeOutposts(){return outposts.filter(o=>o.captured&&o.hp>0)}
