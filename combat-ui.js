'use strict';
window.BunnyCombatUI = { mount(config) {
  const id=config.id, game=new config.Engine(), get=suffix=>document.getElementById(id+'-'+suffix);
  const foes=()=>game[config.enemyKey||(config.theme==='adobe'?'spiders':'snakes')];
  const surface = get('canvas'), paint = surface.getContext('2d'), cover = get('overlay');
  const input = {dx:0,dy:0,fire:false}, keys = new Set(), mouse = {fire:false,aim:null};
  const touch = {dx:0,dy:0,fire:false,pointer:null}, stick = get('stick');
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let frame = null, previous = 0, camera = {x:0,y:0}, resultSaved = false;
  let best = Number(storage.read('mate-' + id + '-best',0)) || 0, savedFlame = !!storage.read('mate-' + id + '-flame',false);
  let soundEnabled = !!storage.read('mate-' + id + '-sound',false), audio;
  let sweetEffects = [];
  function tone(freq=520, length=.07) {
    if (!soundEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio(); audio.resume?.();
      const oscillator=audio.createOscillator(), volume=audio.createGain(), time=audio.currentTime;
      oscillator.type='square'; oscillator.frequency.setValueAtTime(freq,time);
      volume.gain.setValueAtTime(.035,time); volume.gain.exponentialRampToValueAtTime(.001,time+length);
      oscillator.onended=()=>{oscillator.disconnect();volume.disconnect();};
      oscillator.connect(volume); volume.connect(audio.destination); oscillator.start(time); oscillator.stop(time+length);
    } catch { /* Sound is optional; unavailable audio must not interrupt gameplay. */ }
  }
  function puff() {
    if (!soundEnabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio(); audio.resume?.();
      const time=audio.currentTime, length=.14;
      const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*length),audio.sampleRate);
      const samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);
      const source=audio.createBufferSource(), filter=audio.createBiquadFilter(), volume=audio.createGain();
      source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(950,time);
      filter.frequency.exponentialRampToValueAtTime(220,time+length);filter.Q.value=.5;
      volume.gain.setValueAtTime(.001,time);volume.gain.linearRampToValueAtTime(.2,time+.015);
      volume.gain.exponentialRampToValueAtTime(.001,time+length);
      source.connect(filter);filter.connect(volume);volume.connect(audio.destination);
      source.onended=()=>{source.disconnect();filter.disconnect();volume.disconnect();};
      source.start(time);source.stop(time+length);
    } catch { /* A cotton puff stays playable even without audio support. */ }
  }
  function launchCotton(aimX,aimY){if(game.shoot(aimX,aimY))puff();}
  function resizeSurface() {
    const rect = surface.parentElement.getBoundingClientRect(), mobile = !!window.BunnyMobile?.isMobile();
    let width=960, height=640;
    if (mobile && rect.width > 0 && rect.height > 0) {
      const ratio=rect.width/rect.height;
      height=Math.min(640,Math.round(960/ratio)); width=Math.min(960,Math.max(260,Math.round(height*ratio)));
    }
    if (surface.width!==width) surface.width=width;
    if (surface.height!==height) surface.height=height;
  }
  function clearInput() {
    keys.clear(); touch.dx=touch.dy=0; touch.fire=false; touch.pointer=null; firePointer=null; mouse.fire=false; mouse.aim=null;
    input.dx=input.dy=0; input.fire=false; delete input.aimX; delete input.aimY;
    stick.querySelector('span').style.transform='translate(0,0)'; get('fire').setAttribute('aria-pressed','false');
  }
  function hud() {
    get('health').textContent='♥'.repeat(game.player.health)+'♡'.repeat(game.player.maxHealth-game.player.health);
    get('health').setAttribute('aria-label',`Vida: ${game.player.health} de ${game.player.maxHealth}`);
    get('hearts').textContent=`♥ ${game.waveHearts}/${game.goal}`;
    get('wave').textContent=`ZONA ${game.wave}/3`;
    get('pause').textContent=game.state==='paused'?'▶':'Ⅱ';
    get('pause').setAttribute('aria-label',game.state==='paused'?'Continuar '+config.title:'Pausar '+config.title);
    get('sound').textContent=soundEnabled?'♪ Sonido':'♪ Sin sonido';
    get('sound').setAttribute('aria-pressed',String(soundEnabled));
    const remaining=foes().length;
    get('message').textContent=game.state==='won'?'¡Completaste tu recorrido por '+config.country+'!':game.fire.unlocked?'La llama está lista. Sigue la señal dorada.':`${config.theme==='canyon'?['El camino de los Andes','Las terrazas de piedra','La cumbre de la llama'][game.wave-1]:game.waveName} · ${remaining} ${config.enemyPlural} por transformar · ${game.goal-game.waveHearts} corazones por encontrar`;
  }
  function overlay() {
    cover.hidden=game.state==='playing'; if(cover.hidden)return;
    const mode=game.state;
    const title=mode==='paused'?`Tu ${config.setting}<br><span>puede esperar.</span>`:mode==='won'?'¡Expedición<br><span>completada!</span>':mode==='over'?`${config.characterName||'Mate'} vuelve<br><span>a intentarlo.</span>`:`${config.readyTitle}<br><span>Explora el Perú.</span>`;
    const copy=mode==='paused'?'Tus corazones y tu recorrido siguen aquí.':mode==='won'?`Recogiste ${game.stats.hearts} corazones y superaste tres zonas. ${game.stats.score} puntos · Récord: ${best}.`:mode==='over'?`${config.enemiesTitle} te alcanzaron. ${config.alliesCopy}`:config.intro;
    cover.innerHTML=`<span class="combat-medal" aria-hidden="true">${mode==='won'?'🔥':'☁'}</span><span class="eyebrow">${config.title.toUpperCase()} / ${config.arcadeLabel}</span><h2>${title}</h2><p>${copy}</p><button type="button" id="${id}-start" class="primary">${mode==='paused'?'Continuar':mode==='won'?'Otra expedición':mode==='over'?'Volver a intentar':config.startLabel||'Entrar a la selva'} ▶</button>${mode==='won'?'<a class="game-shop-cta" href="#tienda">Celebrar en la tienda ↗</a>':''}<small>WASD / flechas · Espacio o J: lanzar algodón · Mouse: apuntar · P: pausa${savedFlame?' · Fuego conseguido ✓':''}</small>`;
    get('start').onclick=start;
  }
  function start() {
    if(game.state==='over'||game.state==='won'){game.reset();resultSaved=false;sweetEffects=[];}
    clearInput(); game.start(); previous=0; surface.focus(); tone(650,.1); resizeSurface(); render(); schedule();
  }
  function pause() {
    clearInput(); if(frame!==null){cancelAnimationFrame(frame);frame=null;}
    if(game.state==='playing')game.pause(); render();
  }
  function togglePause() { if(game.state==='paused')start();else if(game.state==='playing')pause(); }
  function schedule() { if(frame===null&&game.state==='playing')frame=requestAnimationFrame(tick); }
  function tick(time) {
    frame=null;
    if(document.hidden||location.hash.split('/')[0]!=='#'+id){pause();return;}
    const dt=previous?Math.min(.05,Math.max(0,(time-previous)/1000)):1/60; previous=time;
    input.dx=touch.dx+(Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')));
    input.dy=touch.dy+(Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW')));
    input.fire=touch.fire||mouse.fire||keys.has('Space')||keys.has('KeyJ');
    if(mouse.aim&&!touch.fire){input.aimX=mouse.aim.x-game.player.x;input.aimY=mouse.aim.y-game.player.y;}else{delete input.aimX;delete input.aimY;}
    const shots=game.stats.shots, hearts=game.stats.hearts, health=game.player.health, beforeFoes=[...foes()];
    game.update(dt,input);
    sweetEffects=sweetEffects.filter(effect=>(effect.age+=dt)<effect.duration);
    for(const animal of beforeFoes)if(animal.hp<=0)sweetEffects.push({x:animal.x,y:animal.y,age:0,duration:2.4});
    if(game.stats.shots>shots)puff();
    if(game.stats.hearts>hearts)tone(880,.08);else if(game.player.health<health)tone(130,.13);
    if((game.state==='won'||game.state==='over')&&!resultSaved){
      resultSaved=true; best=Math.max(best,game.stats.score); storage.write('mate-' + id + '-best',best);
      if(game.state==='won'){savedFlame=storage.write('mate-' + id + '-flame',true)||savedFlame;clearInput();tone(1040,.22);}
    }
    render(); schedule();
  }
  const bunnyRows=['..KKK....KKK..','..KWWK..KWWK..','..KPWK..KPWK..','..KPWK..KPWK..','..KWWK..KWWK..','..KWWKKKKWWK..','.KWWWWWWWWWWK.','KWWWWWWWWWWWWK','KWWWWWWWWWWWWK','KWWKWWWWKWWWWK','KWPWWWWWWPWWWK','KWWWWKKWWWWWWK','.KWWWWWWWWWWK.','..KWWWWWWWWK..','.KWWWWWWWWWWK.','.KWWWWWWWWWWK.','..KPPKKKKPPK..'];
  // Regional sprites keep the existing player position, movement and hitbox.
  // The alpaca's head sits directly on its woolly shoulders: a compact neck.
  const alpacaRows=[
    '....KK...KK.................',
    '....KWK.KWK.................',
    '....KPK.KPK.................',
    '...KKWWKWWKK................',
    '..KWWWWWWWWWK...............',
    '.KWWWWWWWWWWWK..............',
    '.KWWKWWWWKWWWK..............',
    '.KWPWWWWWWPWWK..............',
    '..KWWWPPWWWLK...............',
    '...KWWKKWWLK................',
    '....KWWWWLK.........KK......',
    '.....KWWWKK.KKKK...KWWK.....',
    '.....KWWWWKKWWWWKKKWWK......',
    '....KWWWWWWWWWWWWWWWWK......',
    '...KWWWWWWWWWWWWWWWWWLK.....',
    '...KWWWWCWWWWCWWWWWWLLK.....',
    '....KWWWWWWWWWWWWWCLLK......',
    '.....KLLWLLWWLLWLLLLK.......',
    '.....KWWK.KWWK.KWWK.KWWK....',
    '.....KWWK.KWWK.KWWK.KWWK....',
    '.....KPPK.KPPK.KPPK.KPPK....',
    '.....KKKK.KKKK.KKKK.KKKK....'
  ];
  const dolphinRows=[
    '...............KKK..............',
    '..............KPPPK.............',
    '..........KKKKPPPK..............',
    '........KKPPPPPPPKKK............',
    '......KKPPWWPPPPPPPPKK..........',
    '.....KPPWWPPPPPPPPPPPPK.........',
    '....KPPPPPKPPPPPPPPPPPPK........',
    '.KKKPPPPPPKPPPPPPPPPPPPPK.......',
    'KPPPPPPPPPPPPPPPPPPPPPPPPK...KK.',
    'KPPPPPPPPPPPPPPPPPPPPPPPPPK.KPPK',
    '.KKKKKKPPPPPPPPPPPPPPPPPPPPKPPPK',
    '.......KPPCCCCPPPPPPPPPPPPPKPPPK',
    '........KCCCCCCPPPPPPPPPPPKPPPK.',
    '.........KCCCCCPPPPPPPPPPKPPPK..',
    '..........KKCPPPPKKKKKKK.KPPPK..',
    '............KPPPK.........KPPK..',
    '............KPPK...........KK...',
    '.............KK.................'
  ];
  const playerSprites={
    alpaca:{rows:alpacaRows,offsetX:26,offsetY:24,size:2,palette:{K:'#302337',W:'#fffbed',C:'#f3e5d1',L:'#d9cbe7',P:'#ffabd1'}},
    dolphin:{rows:dolphinRows,offsetX:32,offsetY:20,size:2,palette:{K:'#573052',P:'#ef8fbd',W:'#ffd8e8',C:'#ffbad5'}},
    bunny:{rows:bunnyRows,offsetX:21,offsetY:32,size:3,palette:{K:'#131a28',W:'#fffbed',P:'#ffabd1'}}
  };
  const playerSprite=playerSprites[config.playerAvatar]||playerSprites.bunny;
  function pixels(rows,x,y,size,palette) {
    for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){const color=palette[rows[row][col]];if(color){paint.fillStyle=color;paint.fillRect(Math.round(x+col*size),Math.round(y+row*size),size,size);}}
  }
  function shadow(x,y,r=21){paint.fillStyle=config.theme==='jungle'?'#071d2470':'#70484250';paint.beginPath();paint.ellipse(x,y+15,r,8,0,0,Math.PI*2);paint.fill();}
  function heart(x,y,scale=1,color='#ff86b5') {
    paint.save();paint.translate(x,y);paint.scale(scale,scale);
    const rows=['.KK.KK.','KPPKPPK','KPPPPPK','.KPPPK.','..KPK..','...K...'];
    pixels(rows,-14,-12,4,{K:'#582047',P:color});paint.fillStyle='#ffe3eb';paint.fillRect(-8,-8,4,4);paint.restore();
  }
  const cottonRows=['...LLL....','..LWWPL...','.LWWWWWWL.','LWWWWWWWWL','LWWWPWWTWL','.LWWWWWTT.','..LWWWTTL.','...LLTL...'];
  const cottonPalette={L:'#a58bc8',W:'#fff5ff',P:'#ffc4e0',T:'#a5eee0'};
  function cotton(x,y,size=2,alpha=1) {
    paint.save();paint.globalAlpha*=alpha;
    pixels(cottonRows,x-size*5,y-size*4,size,cottonPalette);
    paint.restore();
  }
  function sweetTransformation(effect) {
    const {x,y,age,duration}=effect, fade=Math.min(1,(duration-age)/.55), bob=reduced()?0:Math.sin(age*3)*2;
    paint.save();paint.globalAlpha=fade;shadow(x,y,22);
    if(age<.45){
      for(let n=0;n<4;n++){const angle=n*Math.PI/2;cotton(x+Math.cos(angle)*age*32,y+Math.sin(angle)*age*24,2,1-age/.45);}
    }
    const rows=['..LLL...LLL..','.LPPPL.LPPPL.','LPPWWPLPPPWWL','LPPPPPPPPPPPL','LPPPPPPPPPPPL','.LPPPPPPPPPL.','..LPPPPPPPL..','...LPPPPPL...','....LPPPL....','.....LPL.....','......L......'];
    paint.save();paint.translate(x,y-4+bob);
    const scale=reduced()?1:Math.min(1,.65+age*2);paint.scale(scale,scale);
    pixels(rows,-26,-22,4,{L:'#9276b7',P:'#ffbddc',W:'#ffeefa'});
    heart(-10,-4,.23,'#e75a9c');heart(10,-4,.23,'#e75a9c');
    paint.strokeStyle='#79538a';paint.lineWidth=2;paint.beginPath();paint.arc(0,2,4,0,Math.PI);paint.stroke();
    paint.restore();
    paint.font='bold 13px monospace';paint.textAlign='center';paint.fillStyle='#fff8ff';paint.strokeStyle='#725183';paint.lineWidth=3;
    paint.strokeText('Zzz',x+24,y-28+bob);paint.fillText('Zzz',x+24,y-28+bob);
    paint.restore();
  }
  function flame(x,y,scale=1) {
    paint.save();paint.translate(x,y);paint.scale(scale,scale);paint.shadowColor='#ffbe6c';paint.shadowBlur=reduced()?0:20;
    pixels(['...Y....','...YY...','..YOY...','..YOYY..','.YOOOY..','YOOOOYY.','YOOYYOY.','YOOYWYY.','.YYYYY..'], -20,-31,5,{Y:'#ffd271',O:'#ff846b',W:'#fff2ce'});paint.restore();
  }
  function ally(a) {
    if(config.theme==='adobe'){adobeAlly(a);return;}
    if(config.theme==='canyon'){bear(a);return;}
    const koala=a.kind==='koala',color=koala?'#bacfcb':'#e9b685';shadow(a.x,a.y,20);paint.save();paint.translate(a.x,a.y);
    paint.globalAlpha=a.available===false?.62:1; paint.fillStyle='#192d34';
    if(koala){paint.fillRect(-24,-17,15,17);paint.fillRect(10,-17,15,17);}else{paint.fillRect(-13,-30,8,25);paint.fillRect(7,-32,8,25);paint.fillRect(12,12,17,8);}
    paint.fillRect(-17,-16,34,38);paint.fillStyle=color;paint.fillRect(-14,-13,28,32);
    if(koala){paint.fillRect(-21,-14,12,11);paint.fillRect(12,-14,10,11);}
    paint.fillStyle='#253039';paint.fillRect(-10,-4,4,4);paint.fillRect(8,-4,4,4);paint.fillRect(koala?-4:-2,2,koala?8:4,koala?10:4);
    paint.fillStyle='#ffd1df';paint.fillRect(-11,4,5,3);paint.fillRect(8,4,5,3);
    paint.restore();if(a.available!==false)heart(a.x,a.y-41,.45,'#acebd3');
  }
  function snake(s,time) {
    if(config.theme==='adobe'){spider(s,time);return;}
    if(config.theme==='canyon'){eagle(s,time);return;}
    const angle=Math.atan2(game.player.y-s.y,game.player.x-s.x);shadow(s.x,s.y,22);paint.save();paint.translate(s.x,s.y);paint.rotate(angle);
    for(let i=4;i>=0;i--){const y=reduced()?0:Math.sin(time*7-i)*5;paint.fillStyle='#0d262b';paint.fillRect(-i*8-10,y-8,17,16);paint.fillStyle=i%2?'#47b894':'#76dd96';paint.fillRect(-i*8-8,y-6,13,11);}
    paint.fillStyle='#12332b';paint.fillRect(-7,-12,23,24);paint.fillStyle=s.hitTimer>0?'#fff3d8':'#93eaae';paint.fillRect(-5,-9,18,18);paint.fillStyle='#f7618e';paint.fillRect(8,-8,5,4);paint.fillRect(8,4,5,4);paint.fillRect(15,-1,12,2);
    paint.restore();
    paint.fillStyle='#142431';paint.fillRect(s.x-12,s.y-23,24,4);paint.fillStyle='#ffafcb';paint.fillRect(s.x-12,s.y-23,24*s.hp/s.maxHp,4);
  }
  function fern(x,y,scale=1) {
    paint.save();paint.translate(x,y);paint.scale(scale,scale);
    paint.fillStyle='#0f302d';paint.fillRect(-28,-19,57,30);
    for(let row=0;row<5;row++){
      const reach=26-row*4;paint.fillStyle=row%2?'#4c8760':'#397355';
      paint.fillRect(-reach,-row*8,reach-2,5);paint.fillRect(3,-row*8,reach-2,5);
      paint.fillStyle='#8abc7833';paint.fillRect(-reach,-row*8,5,3);
    }
    paint.fillStyle='#80a46d';paint.fillRect(-2,-38,4,49);paint.restore();
  }
  function bear(a) {
    shadow(a.x,a.y,25);paint.save();paint.translate(a.x,a.y);paint.globalAlpha=a.available===false?.6:1;
    const rows=['..KKK......KKK..','.KBBBKKKKKKBBBK.','.KBBBBBBBBBBBBK.','..KBBBBBBBBBBK..','.KBBBBBBBBBBBBK.','KBBBBKBBBBKBBBBK','KBBBBBBBBBBBBBBK','KBBBMMMMMMMMBBBK','.KBBMMMMMMMMBBK.','..KBBBBKKBBBBK..','..KBBBBBBBBBBK..','.KBBBBBBBBBBBBK.','KBBBBMMMMMMBBBBK','KBBBBMMMMMMBBBBK','.KBBBMMMMMMBBBK.','..KBBBKKKKBBBK..','..KBBB....BBBK..','..KKKK....KKKK..'];
    pixels(rows,-24,-32,3,{K:'#4a3340',B:a.id==='bear-2'?'#c78d68':'#a17560',M:'#ffe0b4'});
    paint.fillStyle='#422d36';paint.fillRect(-3,-9,7,4);paint.fillRect(0,-5,2,4);
    paint.fillStyle='#eda3b7';paint.fillRect(-16,-8,4,3);paint.fillRect(12,-8,4,3);
    paint.fillStyle='#88d8c9';paint.fillRect(-15,0,30,5);paint.fillRect(10,2,5,10);
    paint.restore();if(a.available!==false)heart(a.x,a.y-46,.5,'#88e0ce');
  }
  function eagle(e,time) {
    shadow(e.x,e.y,18);paint.save();paint.translate(e.x,e.y);
    const lift=reduced()?0:Math.sin(time*9+(e.id?.length||0))*5;
    for(const side of [-1,1]){
      paint.save();paint.scale(side,1);paint.translate(0,lift);
      paint.fillStyle='#513440';paint.fillRect(5,-5,28,11);paint.fillRect(18,-11,17,9);paint.fillRect(28,-16,10,8);
      paint.fillStyle='#b17861';paint.fillRect(10,-5,23,4);paint.fillRect(25,-10,8,4);
      paint.fillStyle='#ecc1a1';paint.fillRect(19,3,12,3);paint.fillRect(29,-6,6,3);paint.restore();
    }
    paint.fillStyle='#513440';paint.fillRect(-10,-8,20,24);paint.fillRect(-7,14,14,7);
    paint.fillStyle='#997057';paint.fillRect(-7,1,14,13);
    paint.fillStyle='#4d3341';paint.fillRect(-12,-22,24,20);paint.fillStyle=e.hitTimer>0?'#fff7b0':'#fff6df';paint.fillRect(-9,-19,18,15);
    paint.fillStyle='#623743';paint.fillRect(-7,-15,4,3);paint.fillRect(4,-15,4,3);
    paint.fillStyle='#f4b651';paint.fillRect(-4,-9,9,5);paint.fillRect(-2,-4,5,3);paint.restore();
    paint.fillStyle='#68404c';paint.fillRect(e.x-12,e.y-34,24,4);paint.fillStyle='#ffaac8';paint.fillRect(e.x-12,e.y-34,24*e.hp/e.maxHp,4);
  }
  function canyonBackdrop() {
    const floor=paint.createLinearGradient(0,0,960,640);floor.addColorStop(0,'#8caa89');floor.addColorStop(1,'#56786b');paint.fillStyle=floor;paint.fillRect(0,0,960,640);
    // Walkable canyon floor with strata and rocky mesas that match engine collisions.
    paint.strokeStyle='#f8d8b845';paint.lineWidth=56;paint.beginPath();paint.moveTo(60,540);paint.bezierCurveTo(280,450,500,120,900,100);paint.stroke();
    for(let i=0;i<130;i++){
      const x=(i*137+61)%960,y=(i*79+45)%640;paint.fillStyle=i%4?'#8e5d4d24':'#fff0d637';paint.fillRect(x,y,i%4?3:14,2);
    }
    // Distant Andean peaks decorate the border; playable geometry stays the same.
    paint.fillStyle='#355b60';paint.beginPath();paint.moveTo(180,24);paint.lineTo(235,0);paint.lineTo(290,18);paint.lineTo(370,0);paint.lineTo(415,24);paint.fill();
    paint.fillStyle='#788577';paint.fillRect(0,0,960,24);paint.fillRect(0,618,960,22);paint.fillRect(0,0,18,640);paint.fillRect(942,0,18,640);
    paint.fillStyle='#d88868';paint.fillRect(0,8,960,6);paint.fillRect(0,626,960,4);paint.fillStyle='#ffc395';paint.fillRect(0,0,960,4);
    for(const wall of game.walls||[]){
      const {x,y,w,h}=wall;paint.fillStyle='#74485340';paint.fillRect(x+7,y+9,w,h);
      paint.fillStyle='#737a70';paint.fillRect(x,y,w,h);paint.fillStyle='#a5ad94';paint.fillRect(x+4,y+4,w-8,h-9);
      paint.fillStyle='#d6d4b1';paint.fillRect(x,y,w,5);paint.fillStyle='#52685c';paint.fillRect(x+w-5,y+5,5,h-5);paint.fillRect(x,y+h-8,w,8);
      for(let py=y+14;py<y+h-10;py+=17){paint.fillStyle='#667d61';paint.fillRect(x+4,py,w-9,4);for(let px=x+8+(Math.floor(py/17)%2)*12;px<x+w-8;px+=26){paint.fillStyle='#778276';paint.fillRect(px,py-10,2,10);}}
      if(h>100){paint.fillStyle='#3d514b';paint.beginPath();paint.moveTo(x+w*.32,y+h-12);paint.lineTo(x+w*.4,y+h-48);paint.lineTo(x+w*.6,y+h-48);paint.lineTo(x+w*.68,y+h-12);paint.fill();}
      paint.fillStyle='#ecc19b';paint.fillRect(x+8,y+8,Math.max(3,Math.min(w-16,28)),3);
      paint.strokeStyle='#8a5355';paint.lineWidth=1;paint.strokeRect(x,y,w,h);
    }
    for(const [x,y]of[[60,170],[900,510],[490,610]]){
      paint.fillStyle='#699687';paint.fillRect(x-2,y-15,5,26);paint.fillRect(x-11,y-10,6,12);paint.fillRect(x+7,y-18,5,17);paint.fillRect(x-8,y-1,19,4);
    }
  }
  function adobeAlly(a) {
    shadow(a.x,a.y,21);paint.save();paint.translate(a.x,a.y);paint.globalAlpha=a.available===false?.6:1;
    const rows=['....KK..KK......','....KWKKWK......','....KWWWWK......','...KWWWWWWK.....','...KWWKWWWK.....','...KWWWWWWK.....','....KWWWKK......','....KWWWK.......','....KWWWK.......','....KWWWK.......','....KWWWK.......','....KWWWK.......','...KKWWWKKKK....','..KWWWWWWWWWK...','..KWWWWWWWWWK...','..KWWWWWWWWWK...','...KKWKKKKWKK...','....KWWK.KWWK...','....KWWK.KWWK...','....KKKK.KKKK...'];
    pixels(rows,-24,-42,3,{K:'#503a37',W:a.id==='llama-2'?'#d6b596':'#fff1d4'});
    paint.fillStyle='#70d4ca';paint.fillRect(-12,-8,14,5);paint.fillRect(1,-6,5,13);
    paint.fillStyle='#e88aac';paint.fillRect(-3,1,19,11);paint.fillStyle='#ffd6a0';paint.fillRect(2,3,4,7);paint.fillRect(10,3,4,7);
    paint.restore();if(a.available!==false)heart(a.x,a.y-57,.5,'#88e0ce');
  }
  function spider(s,time) {
    shadow(s.x,s.y,25);paint.save();paint.translate(s.x,s.y);paint.rotate((s.angle||0)+Math.PI/2);
    paint.strokeStyle='#432947';paint.lineWidth=4;paint.lineCap='square';
    for(let side of [-1,1])for(let i=0;i<4;i++){
      const sway=reduced()?0:Math.sin(time*9+i*1.7)*3,y=-10+i*7;
      paint.beginPath();paint.moveTo(side*8,y);paint.lineTo(side*(20+i%2*4),y-5+sway);paint.lineTo(side*(31-i%2*3),y+7+sway);paint.stroke();
    }
    paint.fillStyle='#4c2c53';paint.fillRect(-14,-2,28,25);paint.fillRect(-11,-17,22,19);
    paint.fillStyle=s.hitTimer>0?'#fff1b6':'#ad80ca';paint.fillRect(-10,1,20,18);paint.fillStyle='#d4b0e9';paint.fillRect(-7,3,6,5);
    paint.fillStyle='#f17a9d';paint.fillRect(-8,-14,5,4);paint.fillRect(3,-14,5,4);paint.fillStyle='#fff2da';paint.fillRect(-7,-14,2,2);paint.fillRect(4,-14,2,2);paint.restore();
    paint.fillStyle='#5b354c';paint.fillRect(s.x-12,s.y-34,24,4);paint.fillStyle='#ffb4cc';paint.fillRect(s.x-12,s.y-34,24*s.hp/s.maxHp,4);
  }
  function adobeBackdrop() {
    const floor=paint.createLinearGradient(0,0,960,640);floor.addColorStop(0,'#ddc6a6');floor.addColorStop(1,'#cfa47a');paint.fillStyle=floor;paint.fillRect(0,0,960,640);
    for(let i=0;i<150;i++){
      const x=(i*131+37)%960,y=(i*79+43)%640;paint.fillStyle=i%3?'#af855d25':'#fff0d029';paint.fillRect(x,y,i%3?3:13,3);
    }
    // Stylized geometric friezes reference adobe architecture, with playable gaps.
    paint.fillStyle='#af7f5a';paint.fillRect(0,0,960,22);paint.fillRect(0,618,960,22);
    paint.fillStyle='#eed1ab';paint.fillRect(0,0,960,5);
    for(let x=36;x<950;x+=38){paint.fillStyle='#815c4555';paint.fillRect(x,8,12,6);paint.fillRect(x+4,14,4,4);}
    for(const wall of game.walls){
      const {x,y,w,h}=wall;paint.fillStyle='#8d675340';paint.fillRect(x+5,y+8,w,h);
      paint.fillStyle='#ae7b58';paint.fillRect(x,y,w,h);paint.fillStyle='#e7c69a';paint.fillRect(x,y,w,5);paint.fillStyle='#875d47';paint.fillRect(x+w-5,y+5,5,h-5);
      paint.strokeStyle='#825942';paint.lineWidth=1;paint.strokeRect(x,y,w,h);
      if(w>h){
        for(let fx=x+12;fx<x+w-18;fx+=33){paint.fillStyle='#825b45';paint.fillRect(fx,y+13,11,7);paint.fillRect(fx+11,y+10,5,13);paint.fillStyle='#d1ab81';paint.fillRect(fx+2,y+13,3,3);}
      }else{
        for(let fy=y+14;fy<y+h-15;fy+=29){paint.fillStyle='#93664c';paint.fillRect(x+6,fy,Math.max(3,w-14),3);paint.fillRect(x+10,fy-5,4,13);}
      }
    }
  }
  function scene() {
    const w=surface.width,h=surface.height,p=game.player,time=game.elapsed||0;
    camera={x:Math.max(0,Math.min(game.width-w,p.x-w/2)),y:Math.max(0,Math.min(game.height-h,p.y-h/2))};
    paint.fillStyle='#193d36';paint.fillRect(0,0,w,h);paint.save();paint.translate(-camera.x,-camera.y);
    if(config.theme==='adobe')adobeBackdrop();else if(config.theme==='canyon')canyonBackdrop();else {
    const floor=paint.createLinearGradient(0,0,960,640);floor.addColorStop(0,'#284d44');floor.addColorStop(1,'#15392f');paint.fillStyle=floor;paint.fillRect(0,0,960,640);
    // Original jungle scenery: a winding trail, river and eucalyptus canopy.
    paint.strokeStyle='#53867a38';paint.lineWidth=78;paint.beginPath();paint.moveTo(70,540);paint.bezierCurveTo(280,120,540,620,885,110);paint.stroke();
    paint.strokeStyle='#82b99b18';paint.lineWidth=38;paint.stroke();
    for(let i=0;i<110;i++){const x=(i*137+41)%925+17,y=(i*83+57)%600+20;paint.fillStyle=i%3?'#8ba97b26':'#b8c48c33';paint.fillRect(x,y,3,7);paint.fillRect(x+4,y-1,3,5);}
    for(let i=0;i<18;i++){
      const x=i%2?940:16,y=20+Math.floor(i/2)*77;paint.fillStyle='#142f2d';paint.fillRect(x-9,y-20,18,65);
      paint.fillStyle=i%3?'#315f42':'#417352';paint.fillRect(x-45,y-36,88,26);paint.fillRect(x-34,y-53,66,33);paint.fillStyle='#62905c';paint.fillRect(x-26,y-51,12,8);
    }
    // Soft ferns and leaf litter are passable scenery; hearts remain in front.
    for(const [x,y,scale] of [[120,140,1.4],[300,235,.9],[605,210,1.2],[700,455,1.1],[395,590,1.1],[390,60,.8],[555,370,.75],[845,470,.8]])fern(x,y,scale);
    for(let i=0;i<14;i++){
      const x=90+i*61,y=i%2?35:610;
      paint.fillStyle='#335d47';paint.fillRect(x-19,y-12,37,16);paint.fillRect(x-12,y-23,27,20);
      paint.fillStyle='#6b96703b';paint.fillRect(x-10,y-23,17,5);
    }
    // Boundary bands are visible so the camera edges never look like empty space.
    paint.fillStyle='#102f2c';paint.fillRect(0,0,960,14);paint.fillRect(0,626,960,14);
    }
    for(const obstacle of game.obstacles||[]){paint.fillStyle='#5b756b';paint.fillRect(obstacle.x-obstacle.r,obstacle.y-obstacle.r,obstacle.r*2,obstacle.r*2);}
    for(const item of game.hearts){shadow(item.x,item.y,14);heart(item.x,item.y+(reduced()?0:Math.sin(time*3+item.x)*2));}
    for(const a of game.allies)ally(a);
    for(const s of foes())snake(s,time);
    for(const bullet of game.bullets)cotton(bullet.x,bullet.y);
    if(game.fire.visible){paint.strokeStyle=game.fire.unlocked?'#ffcf88':'#7dbaa166';paint.lineWidth=2;paint.beginPath();paint.ellipse(game.fire.x,game.fire.y+12,34,16,0,0,Math.PI*2);paint.stroke();if(game.fire.unlocked)flame(game.fire.x,game.fire.y);else{paint.fillStyle='#95b8a570';paint.fillRect(game.fire.x-9,game.fire.y-14,18,18);}}
    for(const particle of game.particles){
      if(particle.color==='#91e4bc')continue;
      const alpha=Math.max(0,Math.min(1,particle.life/Math.max(.001,particle.maxLife||1)));
      if(particle.type==='spark'&&particle.color!=='#ffc76a')cotton(particle.x,particle.y,.75,alpha*.55);
      else{paint.globalAlpha=alpha;paint.fillStyle=particle.color||'#ffbaca';paint.fillRect(particle.x-3,particle.y-3,6,6);paint.globalAlpha=1;}
    }
    for(const effect of sweetEffects)sweetTransformation(effect);
    shadow(p.x,p.y,23);if(p.invulnerable>0){paint.strokeStyle='#c1ffe0';paint.lineWidth=2;paint.beginPath();paint.arc(p.x,p.y,30,0,Math.PI*2);paint.stroke();}
    if(!p.invulnerable||Math.floor(time*10)%2===0)pixels(playerSprite.rows,p.x-playerSprite.offsetX,p.y-playerSprite.offsetY,playerSprite.size,playerSprite.palette);
    const d=p.direction||{x:1,y:0};cotton(p.x+d.x*28,p.y+d.y*28,1.25);
    paint.restore();
    // A small radar keeps far-away hearts, allies and the flame easy to find on mobile.
    const mapW=Math.min(128,w*.26),mapH=mapW*2/3,mx=w-mapW-12,my=12,sx=mapW/960,sy=mapH/640;
    paint.fillStyle='#091e27d9';paint.fillRect(mx-5,my-5,mapW+10,mapH+10);paint.strokeStyle='#a5debf77';paint.lineWidth=1;paint.strokeRect(mx-5,my-5,mapW+10,mapH+10);
    for(const wall of game.walls||[]){paint.fillStyle='#ac845d';paint.fillRect(mx+wall.x*sx,my+wall.y*sy,wall.w*sx,wall.h*sy);}
    const dot=(x,y,color,size=4)=>{paint.fillStyle=color;paint.fillRect(mx+x*sx-size/2,my+y*sy-size/2,size,size);};
    for(const a of game.allies)dot(a.x,a.y,'#a9e8d2');for(const s of foes())dot(s.x,s.y,'#ff7d9d',3);for(const item of game.hearts)dot(item.x,item.y,'#ffbed8');
    if(game.fire.unlocked)dot(game.fire.x,game.fire.y,'#ffd374',7);dot(p.x,p.y,'#fff',5);
    paint.strokeStyle='#fff6';paint.strokeRect(mx+camera.x*sx,my+camera.y*sy,w*sx,h*sy);
    paint.textAlign='left';paint.font='bold 10px monospace';paint.fillStyle='#b0e3c6';paint.fillText('RADAR',mx,my+mapH+18);
    if(game.fire.unlocked){paint.fillStyle='#17252be8';paint.fillRect(12,h-42,Math.min(w-24,240),29);paint.fillStyle='#ffcf88';paint.font='bold 12px monospace';paint.fillText('✦ SIGUE LA LLAMA DORADA',23,h-22);}
    else{paint.fillStyle='#302435df';paint.fillRect(12,h-39,Math.min(w-24,270),27);paint.fillStyle='#ffe6c6';paint.font='bold 12px monospace';paint.fillText((config.theme==='canyon'?['El camino de los Andes','Las terrazas de piedra','La cumbre de la llama'][game.wave-1]:game.waveName).toUpperCase(),22,h-21);}
  }
  function render(){hud();scene();overlay();}
  get('pause').onclick=togglePause;
  get('restart').onclick=()=>{pause();game.reset();resultSaved=false;sweetEffects=[];start();};
  get('sound').onclick=()=>{soundEnabled=!soundEnabled;storage.write('mate-' + id + '-sound',soundEnabled);tone(720,.1);hud();};
  stick.addEventListener('pointerdown',event=>{
    if(game.state!=='playing'||touch.pointer!==null)return;event.preventDefault();mouse.aim=null;touch.pointer=event.pointerId;stick.setPointerCapture?.(event.pointerId);moveStick(event);
  });
  function moveStick(event){
    if(touch.pointer!==event.pointerId)return;
    const rect=stick.getBoundingClientRect(),dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2;
    const distance=Math.hypot(dx,dy),range=rect.width*.32,strength=Math.min(1,distance/range);
    touch.dx=distance>7?dx/distance*strength:0;touch.dy=distance>7?dy/distance*strength:0;
    stick.querySelector('span').style.transform=`translate(${touch.dx*range}px,${touch.dy*range}px)`;
  }
  stick.addEventListener('pointermove',moveStick);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,event=>{if(event.pointerId===touch.pointer){touch.pointer=null;touch.dx=touch.dy=0;stick.querySelector('span').style.transform='translate(0,0)';}});
  const fireButton=get('fire');let firePointer=null,compatibilityClick=false;
  fireButton.addEventListener('pointerdown',event=>{if(game.state!=='playing'||firePointer!==null)return;event.preventDefault();firePointer=event.pointerId;compatibilityClick=true;touch.fire=true;mouse.aim=null;fireButton.setPointerCapture?.(event.pointerId);fireButton.setAttribute('aria-pressed','true');launchCotton();render();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])fireButton.addEventListener(type,event=>{if(event.pointerId===firePointer){firePointer=null;touch.fire=false;fireButton.setAttribute('aria-pressed','false');}});
  fireButton.addEventListener('click',event=>{if(compatibilityClick&&(event.detail>0||event.pointerType)){event.preventDefault();return;}if(game.state==='playing'){launchCotton();render();}});
  const controls=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD','Space','KeyJ']);
  addEventListener('keydown',event=>{
    const target=event.target;if(location.hash!=='#'+id||!target?.closest?.('#'+id+' .game-shell')||/INPUT|SELECT|TEXTAREA/.test(target.tagName||''))return;
    if(target.tagName==='BUTTON'&&['Enter','Space'].includes(event.code))return;
    if(controls.has(event.code)){event.preventDefault();if(game.state==='playing')keys.add(event.code);}
    else if(['KeyP','Escape'].includes(event.code)){event.preventDefault();if(!event.repeat)togglePause();}
  });
  addEventListener('keyup',event=>keys.delete(event.code));
  function aim(event){const rect=surface.getBoundingClientRect();mouse.aim={x:camera.x+(event.clientX-rect.left)/rect.width*surface.width,y:camera.y+(event.clientY-rect.top)/rect.height*surface.height};}
  surface.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')aim(event);});
  surface.addEventListener('pointerdown',event=>{if(game.state!=='playing'||event.pointerType==='touch'||event.button!==0)return;event.preventDefault();aim(event);mouse.fire=true;surface.setPointerCapture?.(event.pointerId);surface.focus();launchCotton(mouse.aim.x-game.player.x,mouse.aim.y-game.player.y);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,()=>{mouse.fire=false;});
  addEventListener('blur',pause);addEventListener('hashchange',()=>{if(location.hash!=='#'+id)pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  const refresh=()=>{resizeSurface();render();};addEventListener('resize',refresh);
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(refresh).observe(surface.parentElement);
  window[id+'Game']={start,pause,refresh,progress:()=>({...game.progress(),player:{...game.player},bulletsCount:game.bullets.length,best,savedFlame})};
  resizeSurface();render();
}};
