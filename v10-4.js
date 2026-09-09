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
  defs.forEach(([x,z,type,cost],i++)=>{});
}
