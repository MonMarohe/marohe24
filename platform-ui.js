'use strict';

(() => {
  if (typeof CreativePlatformer === 'undefined') return;
  const get = id => document.getElementById(id), surface = get('platform-canvas');
  if (!surface) return;
  const paint = surface.getContext('2d');
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let saved = storage.read('mate-fuel-progress', {unlocked: 0, won: []});
  if (!saved || typeof saved !== 'object') saved = {};
  saved.won = [...new Set(Array.isArray(saved.won) ? saved.won.filter(id => Number.isInteger(id) && id >= 0 && id < 7) : [])];
  saved.unlocked = Math.max(0, Math.min(6, Number.isInteger(saved.unlocked) ? saved.unlocked : 0));
  const game = new CreativePlatformer();
  const input = {left: false, right: false, jump: false};
  let frame = 0, lastTime = 0, camera = 0, clock = 0, feedback = '', particles = [];
  let lastCounts = {collected: 0, built: 0, planted: 0, hits: 0};
  const themes = [
    ['#e5f8f6', '#49cfc7', '#e83d9b'], ['#e3f7f3', '#55d5c8', '#e82087'],
    ['#f0e6ff', '#a86de8', '#e338a1'], ['#dce8e2', '#dc2180', '#65b72c'],
    ['#e2edf0', '#4ecdc4', '#8b55d9'], ['#ece5f5', '#73c9d6', '#df2878'],
    ['#dde9e1', '#55cfc5', '#7d4ac8']
  ];
  const goals = () => game.level.goals || {sparks: 6, built: 2, planted: 2};

  function resizeSurface() {
    const width = surface.getBoundingClientRect?.().width || 0;
    if (!width) return;
    const view = window.BunnyMobile?.isMobile() ? window.BunnyMobile.viewWidth(surface.getBoundingClientRect(), 600, 1000) : Math.max(620, Math.min(1000, Math.round(width * 1.15)));
    if (surface.width !== view) surface.width = view;
    const rect=surface.getBoundingClientRect(),height=window.BunnyMobile?.isMobile()?Math.max(120,Math.min(600,Math.round(view*rect.height/rect.width))):600;
    if(surface.height!==height)surface.height=height;
    surface.style.aspectRatio = `${view} / 600`;
    camera = Math.max(0, Math.min(game.level.width - view, game.player.x - view * .27));
  }

  function clearInput() { input.left = input.right = input.jump = false; }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function schedule() { if (!frame && game.state === 'playing') frame = requestAnimationFrame(loop); }
  function tell(message) { feedback = message; if (get('platform-message').textContent !== message) get('platform-message').textContent = message; }

  function levels() {
    get('platform-levels').innerHTML = CreativePlatformer.LEVELS.map((level, i) => `<button type="button" data-fuel-level="${i}" class="fuel-level ${i === game.index ? 'selected' : ''} ${saved.won.includes(i) ? 'completed' : ''}" ${i === game.index ? 'aria-current="step"' : ''}><span>${saved.won.includes(i) ? '✓' : i > saved.unlocked ? '⌑' : String(i + 1).padStart(2, '0')}</span><span><strong>${level.name}</strong><small>${saved.won.includes(i) ? 'Fuego recuperado' : i > saved.unlocked ? 'Completa el barrio anterior' : 'Barrio abierto'}</small></span></button>`).join('');
    get('platform-levels').querySelectorAll('[data-fuel-level]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.fuelLevel);
      if (index > saved.unlocked) { tell('Primero recupera el fuego del barrio abierto. Tu ciudad crece un paso a la vez.'); return; }
      load(index);
    }));
  }

  function load(index) {
    stop(); clearInput(); game.reset(index); camera = 0; particles = []; clock = 0;
    lastCounts = {collected: 0, built: 0, planted: 0, hits: 0};
    tell(game.level.mission); levels(); render();
  }

  function hud() {
    const target = goals();
    get('platform-score').textContent = `${game.collected} / ${target.sparks} ✦`;
    get('platform-built').textContent = `${game.built} / ${target.built} puentes`;
    get('platform-trees').textContent = `${game.planted} / ${target.planted} refugios`;
    get('platform-goals').textContent = `Para tomar el fuego: ${target.sparks} chispas, ${target.built} puentes y ${target.planted} árboles.`;
    get('platform-pause').textContent = game.state === 'paused' ? '▶' : 'Ⅱ';
    get('platform-pause').setAttribute('aria-label', game.state === 'paused' ? 'Continuar Welcome Lima' : 'Pausar Welcome Lima');
  }

  function overlay() {
    const panel = get('platform-overlay');
    panel.hidden = game.state === 'playing';
    if (panel.hidden) return;
    const paused = game.state === 'paused', won = game.state === 'won';
    const title = paused ? 'Tu recorrido<br>puede esperar.' : won ? '¡Lima tiene<br>nuevos caminos!' : 'Habla Causa.<br>Explora Lima.';
    const text = paused ? 'Tus puentes, árboles y chispas se quedan aquí. Vuelve a tu ritmo.' : won ? 'Completaste el barrio con Mate. Entre calles y letreros chicha, cada puente te llevó a conocer otra parte de esta Lima imaginada.' : game.level.mission;
    panel.innerHTML = `<span class="eyebrow">BARRIO ${game.index + 1} / ${game.level.name.toUpperCase()}</span><h2>${title}</h2><p>${text}</p><button id="platform-start" type="button" class="primary">${paused ? 'Continuar a mi ritmo' : won ? game.index < 6 ? 'Explorar el siguiente barrio' : 'Volver a mi primera chispa' : 'Empezar a crear'} ✦</button>${won?'<a class="game-shop-cta" href="#tienda">Visitar la tienda ↗</a>':''}<small>${game.level.subtitle}<br>← → Mover · Espacio o ↑ Saltar · B Construir · T Plantar · P Pausar</small>`;
    get('platform-start').addEventListener('click', start);
  }

  function start() {
    clearInput(); resizeSurface();
    if (game.state === 'won') load(game.index < 6 ? game.index + 1 : 0);
    if (game.state === 'paused') game.resume(); else game.start();
    feedback = ''; tell(game.message || 'Salta, construye los puentes marcados y planta refugios para abrir el camino al fuego.');
    render(); surface.focus(); schedule();
  }

  function pause() {
    if (game.state !== 'playing') return;
    game.pause(); clearInput(); stop(); render();
  }

  function action(type) {
    if (type === 'pause') { if (game.state === 'paused') start(); else pause(); return; }
    if (game.state !== 'playing') return;
    if (type === 'build' || type === 'tree') {
      const result = type === 'build' ? game.build() : game.plant();
      tell(result.message);
      if (result.ok) burst(game.player.x + game.player.w / 2, game.player.y + 22, type === 'build' ? '#bd7fff' : '#54dcb5', 22);
      render();
    } else if (type === 'jump') input.jump = true;
    else if (type === 'left' || type === 'right') input[type] = true;
  }

  function burst(x, y, color, count) {
    if (reduced) return;
    for (let i = 0; i < count; i++) particles.push({x, y, vx: (Math.random() - .5) * 220, vy: -Math.random() * 160, life: .6 + Math.random() * .4, color});
    particles = particles.slice(-90);
  }

  function win() {
    if (!saved.won.includes(game.index)) saved.won.push(game.index);
    saved.unlocked = Math.max(saved.unlocked, Math.min(6, game.index + 1));
    const ok = storage.write('mate-fuel-progress', saved);
    tell(ok ? '🔥 Fuego recuperado. Tu insignia queda guardada en tu universo creativo.' : '🔥 Fuego recuperado. El navegador no permite guardar tu insignia después de esta sesión.');
    clearInput(); levels();
  }

  function loop(time) {
    frame = 0;
    if (game.state !== 'playing') return;
    if (document.hidden || location.hash !== '#fuel') { pause(); return; }
    const dt = Math.min(.033, Math.max(0, lastTime ? (time - lastTime) / 1000 : 1 / 60));
    lastTime = time; clock += dt;
    game.update(dt, input);
    if (game.collected > lastCounts.collected) { burst(game.player.x + 15, game.player.y, '#ffd25f', 12); feedback = ''; }
    if (game.hits > lastCounts.hits) { burst(game.player.x + 15, game.player.y + 20, '#ffa9da', 10); feedback = ''; }
    if (game.built > lastCounts.built || game.planted > lastCounts.planted) feedback = '';
    lastCounts = {collected: game.collected, built: game.built, planted: game.planted, hits: game.hits};
    particles.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; });
    particles = particles.filter(p => p.life > 0);
    const target = Math.max(0, Math.min(game.level.width - surface.width, game.player.x - surface.width * .27));
    camera = reduced ? target : camera + (target - camera) * Math.min(1, dt * 7);
    if (!feedback && game.message) tell(game.message);
    if (game.state === 'won') win();
    render(); schedule();
  }

  function star(x, y, size, color) {
    paint.fillStyle = color; paint.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? size * .35 : size; if (i) paint.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else paint.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    paint.closePath(); paint.fill();
  }

  function cityBackground() {
    const [sky, middle, far] = themes[game.index];
    const gradient = paint.createLinearGradient(0, 0, 0, 600); gradient.addColorStop(0, sky); gradient.addColorStop(1, '#fff8f0');
    paint.fillStyle = gradient; paint.fillRect(0, 0, 1000, 600);
    paint.fillStyle = '#fffaf0'; paint.beginPath(); paint.arc(surface.width * .8 - camera * .04, 94, 47, 0, Math.PI * 2); paint.fill();
    for (let i = 0; i < 10; i++) {
      const x = (i * 174 + 70 - camera * .13) % 1740, y = 65 + i % 3 * 35;
      paint.fillStyle = '#ffffffa6'; paint.fillRect(x, y, 62, 17); paint.fillRect(x + 14, y - 13, 35, 18);
    }
    for (let i = -2; i < 20; i++) {
      const x = i * 128 - camera * .2, height = 65 + (i * i * 31 % 145);
      paint.fillStyle = far + '30'; paint.fillRect(x, 485 - height, 104, height + 100);
      paint.fillStyle = '#ffffff50'; paint.fillRect(x + 17, 501 - height, 15, 15); paint.fillRect(x + 60, 501 - height, 15, 15);
    }
    for (let i = -2; i < 24; i++) {
      const x = i * 155 - camera * .42, height = 80 + (i * i * 17 % 96);
      paint.fillStyle = middle; paint.fillRect(x, 500 - height, 126, height + 100);
      paint.fillStyle = '#ffffff60'; paint.fillRect(x - 3, 497 - height, 132, 8);
      for (let yy = 518 - height; yy < 486; yy += 30) { paint.fillStyle = '#ffffff55'; paint.fillRect(x + 18, yy, 15, 13); paint.fillRect(x + 68, yy, 15, 13); }
      if(i%2===0){
        paint.save();paint.translate(x+9,500-height+36);paint.fillStyle='#171126';paint.fillRect(0,0,110,56);
        paint.strokeStyle=['#ff42b5','#b3f127','#ffab25'][Math.abs(i)%3];paint.lineWidth=3;paint.strokeRect(2,2,106,52);
        paint.textAlign='center';paint.font='italic bold 18px Arial';paint.fillStyle='#55e0d2';paint.fillText('HABLA',55,24);
        paint.font='italic bold 18px Arial';paint.fillStyle='#ff69d7';paint.fillText('CAUSA',55,43);paint.restore();
      }
    }
  }

  function block(x, y, w, h, built = false) {
    const color = built ? '#f4bf19' : themes[game.index][1];
    paint.fillStyle = color; paint.fillRect(x, y, w, h);
    paint.fillStyle = '#3c255453'; paint.fillRect(x, y + Math.min(13, h / 2), w, h - Math.min(13, h / 2));
    paint.fillStyle = built ? '#ffd1ef' : '#f05cae'; paint.fillRect(x, y, w, 10);
    paint.strokeStyle = '#4c355f'; paint.lineWidth = 2; paint.strokeRect(x, y, w, h);
    paint.strokeStyle = '#ffffff27';
    for (let xx = x + 40; xx < x + w; xx += 40) { paint.beginPath(); paint.moveTo(xx, y + 13); paint.lineTo(xx, y + h); paint.stroke(); }
    for (let yy = y + 36; yy < y + h; yy += 26) { paint.beginPath(); paint.moveTo(x, yy); paint.lineTo(x + w, yy); paint.stroke(); }
  }

  function tree(t) {
    const x = t.x, y = t.y;
    if (!t.planted) {
      paint.setLineDash([5, 4]); paint.strokeStyle = '#3e9a78'; paint.lineWidth = 2; paint.strokeRect(x - 13, y - 46, 26, 44); paint.setLineDash([]);
      paint.fillStyle = '#418969'; paint.font = 'bold 12px Arial'; paint.textAlign = 'center'; paint.fillText('T', x, y - 53); return;
    }
    const glow = paint.createRadialGradient(x, y - 40, 15, x, y - 40, 180); glow.addColorStop(0, '#73efc834'); glow.addColorStop(1, '#73efc800');
    paint.fillStyle = glow; paint.fillRect(x - 180, y - 200, 360, 260);
    paint.fillStyle = '#8a6284'; paint.fillRect(x - 5, y - 48, 10, 48);
    paint.fillStyle = '#57c6a5'; paint.fillRect(x - 29, y - 88, 58, 33); paint.fillRect(x - 20, y - 105, 40, 25); paint.fillRect(x - 40, y - 70, 80, 22);
    paint.fillStyle = '#99f0c8'; paint.fillRect(x - 20, y - 102, 22, 13); paint.fillRect(x - 35, y - 68, 17, 8);
    star(x + 14, y - 78, 5, '#fff6a4');
  }

  function bomb(enemy) {
    const x = enemy.x + enemy.w / 2, y = enemy.y + enemy.h / 2;
    paint.fillStyle = '#28182f25'; paint.beginPath(); paint.ellipse(x, enemy.y + enemy.h + 4, 22, 5, 0, 0, Math.PI * 2); paint.fill();
    paint.fillStyle = enemy.suppressed ? '#b39cae' : '#24182e'; paint.beginPath(); paint.arc(x, y, enemy.w / 2, 0, Math.PI * 2); paint.fill();
    paint.fillStyle = enemy.suppressed ? '#d9c8d6' : '#5b386a'; paint.fillRect(x - 12, y - 13, 8, 6);
    paint.fillStyle = '#392649'; paint.fillRect(x - 7, y - enemy.h / 2 - 4, 14, 7);
    paint.strokeStyle = '#79465b'; paint.lineWidth = 3; paint.beginPath(); paint.moveTo(x, y - enemy.h / 2 - 4); paint.lineTo(x + 7, y - enemy.h / 2 - 17); paint.stroke();
    if (!enemy.suppressed) {
      star(x + 7, y - enemy.h / 2 - 17, 6 + Math.sin(clock * 14) * 2, '#ff6db8');
      paint.fillStyle = '#ff75cc'; paint.beginPath(); paint.moveTo(x - 13, y - 5); paint.lineTo(x - 3, y); paint.lineTo(x - 12, y + 5); paint.closePath(); paint.fill();
      paint.beginPath(); paint.moveTo(x + 13, y - 5); paint.lineTo(x + 3, y); paint.lineTo(x + 12, y + 5); paint.closePath(); paint.fill();
    } else { paint.strokeStyle = '#756078'; paint.lineWidth = 2; paint.beginPath(); paint.moveTo(x - 13, y + 2); paint.lineTo(x - 5, y + 2); paint.moveTo(x + 5, y + 2); paint.lineTo(x + 13, y + 2); paint.stroke(); }
  }

  function bunny() {
    const p = game.player;
    const bob = p.grounded && Math.abs(p.vx) > 5 && !reduced ? Math.sin(clock * 16) * 1.5 : 0;
    paint.save();
    if (game.invulnerable > 0) paint.globalAlpha = .65 + Math.sin(clock * 14) * .2;
    paint.translate(p.x, p.y + bob); paint.scale(p.w / 32, p.h / 44);
    paint.fillStyle = '#fff'; paint.strokeStyle = '#271735'; paint.lineWidth = 3; paint.lineJoin = 'miter';
    const shape = [[8,1],[14,1],[14,19],[18,19],[18,1],[24,1],[26,4],[26,21],[30,25],[32,32],[30,39],[25,42],[21,40],[17,43],[13,40],[8,42],[2,39],[0,32],[2,27],[6,24],[6,4]];
    paint.beginPath(); shape.forEach(([x,y],i) => i ? paint.lineTo(x,y) : paint.moveTo(x,y)); paint.closePath(); paint.fill(); paint.stroke();
    paint.strokeStyle = '#271735'; paint.lineWidth = 3; paint.beginPath(); paint.moveTo(12,29); paint.lineTo(16,33); paint.lineTo(20,29); paint.moveTo(16,33); paint.lineTo(16,37); paint.stroke();
    paint.restore();
  }

  function flame() {
    const f = game.fire || game.level.fire, x = f.x + f.w / 2, y = f.y + f.h;
    const glow = paint.createRadialGradient(x, y - 22, 5, x, y - 22, 95); glow.addColorStop(0, '#ffe39296'); glow.addColorStop(1, '#ffd38e00');
    paint.fillStyle = glow; paint.fillRect(x - 95, y - 117, 190, 190);
    paint.fillStyle = '#704870'; paint.fillRect(x - 27, y + 3, 54, 14); paint.fillStyle = '#f5baf1'; paint.fillRect(x - 32, y, 64, 7);
    const sway = reduced ? 0 : Math.sin(clock * 7) * 3;
    paint.fillStyle = '#f87cbd'; paint.beginPath(); paint.moveTo(x - 22, y); paint.quadraticCurveTo(x - 33, y - 21, x + sway, y - 65); paint.quadraticCurveTo(x + 3, y - 37, x + 15, y - 43); paint.quadraticCurveTo(x + 40, y - 7, x + 22, y); paint.closePath(); paint.fill();
    paint.fillStyle = '#ffd174'; paint.beginPath(); paint.moveTo(x - 13, y); paint.quadraticCurveTo(x - 16, y - 19, x + 3, y - 40); paint.quadraticCurveTo(x + 24, y - 10, x + 12, y); paint.closePath(); paint.fill();
    paint.fillStyle = '#fff2b0'; paint.beginPath(); paint.ellipse(x, y - 8, 7, 14, 0, 0, Math.PI * 2); paint.fill();
    paint.fillStyle = '#5b3f75'; paint.font = 'bold 12px Arial'; paint.textAlign = 'center'; paint.fillText('TU FUEGO', x, y - 85);
  }

  function scene() {
    paint.clearRect(0, 0, surface.width, surface.height);
    paint.save();paint.translate(0,-Math.max(0,Math.min(600-surface.height,game.player.y+game.player.h/2-surface.height*.5)));cityBackground();
    paint.save(); paint.translate(-camera, 0);
    game.platforms.forEach(p => block(p.x, p.y, p.w, p.h, p.built || p.kind === 'bridge'));
    game.buildSites.filter(site => !site.built).forEach(site => {
      paint.fillStyle = '#bd85fa20'; paint.fillRect(site.x, site.y, site.w, site.h);
      paint.setLineDash([8, 6]); paint.strokeStyle = '#9763ba'; paint.lineWidth = 2; paint.strokeRect(site.x, site.y, site.w, site.h); paint.setLineDash([]);
      paint.fillStyle = '#714d93'; paint.font = 'bold 12px Arial'; paint.textAlign = 'center'; paint.fillText('B · CONSTRUIR PUENTE', site.x + site.w / 2, site.y - 14);
    });
    game.trees.forEach(tree);
    game.sparks.filter(spark => !spark.collected).forEach(spark => {
      const y = spark.y + (reduced ? 0 : Math.sin(clock * 3 + spark.x) * 4);
      star(spark.x, y, 13, '#f2aa41'); star(spark.x, y, 8, '#fff2a5');
    });
    (game.level.checkpoints || []).forEach((check, i) => {
      paint.fillStyle = '#9c7eae'; paint.fillRect(check.x, check.y - 52, 4, 52);
      paint.fillStyle = i <= game.checkpoint ? '#6cdebd' : '#f7a7d6'; paint.fillRect(check.x + 4, check.y - 51, 26, 18);
      star(check.x + 17, check.y - 42, 5, '#fff8d2');
    });
    game.enemies.forEach(bomb); flame(); bunny();
    particles.forEach(p => { paint.globalAlpha = Math.min(1, p.life * 2); paint.fillStyle = p.color; paint.fillRect(p.x, p.y, 5, 5); });
    paint.globalAlpha = 1; paint.restore(); paint.restore(); paint.textAlign = 'left';
  }

  function render() { hud(); scene(); overlay(); }
  get('platform-pause').addEventListener('click', () => action('pause'));
  get('platform-build').addEventListener('click', () => action('build'));
  get('platform-tree').addEventListener('click', () => action('tree'));
  get('platform-restart').addEventListener('click', () => { load(game.index); start(); });
  function bindHold(id, key) {
    const button = get(id);
    button.addEventListener('pointerdown', event => { event.preventDefault(); if (game.state === 'playing') input[key] = true; button.setPointerCapture?.(event.pointerId); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(type => button.addEventListener(type, () => { input[key] = false; }));
    button.addEventListener('keydown', event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (game.state === 'playing') input[key] = true; } });
    button.addEventListener('keyup', () => { input[key] = false; });
  }
  bindHold('platform-left', 'left'); bindHold('platform-right', 'right'); bindHold('platform-jump', 'jump');
  addEventListener('keydown', event => {
    const target = event.target;
    if (location.hash !== '#fuel' || !target?.closest?.('#fuel .fuel-shell') || /INPUT|TEXTAREA|SELECT/.test(target.tagName || '')) return;
    // Controls can keep focus after a touch/click. Keep movement keys working,
    // while leaving Enter/Space to the focused button's normal activation.
    if (target.tagName === 'BUTTON' && ['Enter', 'Space'].includes(event.code)) return;
    const key = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump'}[event.code];
    if (key) { event.preventDefault(); if (game.state === 'playing') input[key] = true; }
    else if (['KeyB','KeyT','KeyP','Escape'].includes(event.code)) { event.preventDefault(); if (!event.repeat) action({KeyB:'build',KeyT:'tree',KeyP:'pause',Escape:'pause'}[event.code]); }
  });
  addEventListener('keyup', event => {
    const key = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump'}[event.code];
    if (key) input[key] = false;
  });
  addEventListener('blur', pause);
  addEventListener('resize', () => { resizeSurface(); render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.platformGame = {pause, start, actions: action, refresh: () => { resizeSurface(); render(); }, progress: () => ({...game.snapshot(), won: [...saved.won], unlocked: saved.unlocked})};
  levels(); tell(game.level.mission); render();
})();
