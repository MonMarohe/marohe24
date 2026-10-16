'use strict';
(() => {
  const games = ['peru','australia','usa','fuel','juego','city','blocks','match'];
  const media = matchMedia('(max-width: 700px), (max-width: 1100px) and (pointer: coarse)');
  const moves = [];
  for (const name of ['blocks','match']) {
    const page = document.getElementById(name), shell = page.querySelector('.game-shell');
    const hud = document.createElement('div'); hud.className = 'mobile-hud'; hud.hidden = true;
    shell.querySelector('.game-top').after(hud);
    for (const selector of name === 'blocks' ? ['.puzzle-stats','.next-piece','#block-restart'] : ['.puzzle-stats','.target-label','#match-progress','#match-restart']) {
      const node = page.querySelector(selector), marker = document.createComment('Desktop game panel');
      node.before(marker);
      const destination = selector === '.puzzle-stats' || selector === '.next-piece' ? hud : shell;
      moves.push({node,marker,destination,name});
    }
  }
  for (const name of games) {
    const page = document.getElementById(name);
    if (document.documentElement.requestFullscreen) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'mobile-fullscreen'; button.textContent = '⛶ Pantalla completa';
      button.addEventListener('click', async () => {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
        catch { button.textContent = 'Usa la app instalada'; }
      });
      page.append(button);
    }
  }
  let frame;
  function resize() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const mobile = media.matches;
      document.body.classList.toggle('mobile-game', mobile && games.includes(document.body.dataset.page));
      for (const {node,marker,destination,name} of moves) {
        if (mobile) {
          if (node.parentNode !== destination) {
            if (node.id.endsWith('restart')) { node.classList.add('mobile-restart'); destination.append(node); }
            else if (destination.classList.contains('mobile-hud')) destination.append(node);
            else destination.querySelector('.match-stage').before(node);
          }
        } else { node.classList.remove('mobile-restart'); marker.after(node); }
        document.querySelector(`#${name} .mobile-hud`).hidden = !mobile;
      }
      const stage = document.querySelector('#match .match-stage');
      if (mobile && !document.getElementById('match').hidden) {
        const rect = stage.getBoundingClientRect();
        stage.style.setProperty('--mobile-board-size', `${Math.max(0, Math.min(rect.width - 16, rect.height - 16))}px`);
      }
      window.usaGame?.refresh(); window.peruGame?.refresh(); window.australiaGame?.refresh(); window.platformGame?.refresh(); window.cityGame?.refresh(); if(document.body.dataset.page==='juego')window.draw?.();
    });
  }
  window.BunnyMobile = { isMobile: () => media.matches, viewWidth: (rect,height,max) => Math.max(220,Math.min(max,Math.round(rect.width / Math.max(1,rect.height) * height))) };
  new MutationObserver(resize).observe(document.body,{attributes:true,attributeFilter:['data-page']});
  const observer = new ResizeObserver(resize);
  for (const name of games) observer.observe(document.querySelector(`#${name} .game-shell`));
  media.addEventListener('change',resize);
  addEventListener('resize',resize); addEventListener('fullscreenchange',resize);
  window.visualViewport?.addEventListener('resize',resize);
  // Direct actions avoid a synthetic click followed by the browser's native click.
  const stopInputs = [];
  for (const button of document.querySelectorAll('#juego [data-move],#blocks [data-block="left"],#blocks [data-block="right"],#blocks [data-block="down"]')) {
    const blocks = button.dataset.block != null;
    const stop = BunnyInput.bindDirection(button, {
      enabled: () => media.matches,
      step: () => button.onclick?.(),
      canRepeat: () => !document.hidden && (!blocks || window.blockGame?.progress().state === 'playing'),
      delay: blocks ? 380 : 300,
      repeat: blocks ? 110 : 150
    });
    stopInputs.push(stop);
    // Changing direction cancels any previous held direction.
    button.addEventListener('pointerdown', () => { for (const other of stopInputs) if (other !== stop) other(); });
  }
  const stopAllInputs = () => stopInputs.forEach(stop => stop());
  addEventListener('blur',stopAllInputs); addEventListener('hashchange',stopAllInputs);
  media.addEventListener('change',stopAllInputs);
  document.addEventListener('visibilitychange',stopAllInputs);
  document.getElementById('block-pause').addEventListener('click',stopAllInputs);
  document.getElementById('block-restart').addEventListener('click',stopAllInputs);
  resize();
})();
