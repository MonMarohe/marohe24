'use strict';

/* A small, deterministic platform game. The renderer owns drawing, controls and
   persistence; this engine owns physics and the creative actions. */
class CreativePlatformer {
  static LEVELS = [
    { name: 'Lima a todo color', subtitle: 'Calles y letreros chicha.', color: '#f875b3', sky: '#fff0f7', mission: 'Construye dos puentes, planta dos refugios y reúne seis chispas para alcanzar tu fuego.', gaps: [600, 1650], gapWidth: 160, shelves: [300, 1210, 2240], noise: 'La prisa' },
    { name: 'La brisa del Pacífico', subtitle: 'Una ciudad junto al mar.', color: '#54cdbf', sky: '#e9fffb', mission: 'Escucha el paisaje, salta las bombas de ruido y crea caminos a tu ritmo.', gaps: [690, 1760], gapWidth: 170, shelves: [350, 1280, 2300], noise: 'El piloto automático' },
    { name: 'Balcones y caminos', subtitle: 'Mira los detalles de la ciudad.', color: '#ac84ea', sky: '#f4edff', mission: 'Pon cubos donde antes faltaba un camino. Mate quiere descubrir qué hay al otro lado.', gaps: [560, 1590], gapWidth: 180, shelves: [270, 1130, 2180], noise: 'Los deberías' },
    { name: 'Un paseo por el barrio', subtitle: 'Cada esquina tiene una historia.', color: '#ed9d64', sky: '#fff4e8', mission: 'Explora arriba y abajo. Combina movimiento, construcción y cuidado para llegar al fuego.', gaps: [740, 1730], gapWidth: 140, shelves: [410, 1330, 2330], noise: 'Las etiquetas' },
    { name: 'Entre plazas y puentes', subtitle: 'Conecta otra parte de Lima.', color: '#799ee8', sky: '#edf4ff', mission: 'Salta hacia una chispa, construye una alternativa y vuelve a intentar desde tu refugio.', gaps: [620, 1680], gapWidth: 180, shelves: [330, 1240, 2250], noise: 'El miedo al juicio' },
    { name: 'Un rincón verde', subtitle: 'Descubre los parques con Mate.', color: '#ef82b9', sky: '#fff0f8', mission: 'Planta árboles para calmar las bombas cercanas. Crear un refugio también es avanzar.', gaps: [700, 1810], gapWidth: 160, shelves: [380, 1320, 2360], noise: 'La comparación' },
    { name: 'Habla Causa', subtitle: 'El recorrido continúa.', color: '#59bcab', sky: '#e9fff5', mission: 'Une los caminos, recorre la ciudad y alcanza la meta final con Mate.', gaps: [590, 1640], gapWidth: 180, shelves: [310, 1180, 2220], noise: 'La exigencia' }
  ].map((theme, index) => {
    const width = 2760, height = 600, floor = 516;
    const [a, b] = theme.gaps, gap = theme.gapWidth;
    const platforms = [
      { x: 0, y: floor, w: a, h: height - floor, kind: 'ground' },
      { x: a + gap, y: floor, w: b - a - gap, h: height - floor, kind: 'ground' },
      { x: b + gap, y: floor, w: width - b - gap, h: height - floor, kind: 'ground' },
      ...theme.shelves.map((x, i) => ({ x, y: floor - (i === 1 ? 78 : 68), w: i === 1 ? 146 : 112, h: 18, kind: 'studio' }))
    ];
    const treeSites = [{ x: a + gap + 115, y: floor }, { x: b + gap + 130, y: floor }];
    const sparkPoints = [
      [110, floor - 34], [theme.shelves[0] + 50, floor - 100],
      [a - 95, floor - 34], [a + gap + 75, floor - 34],
      [theme.shelves[1] + 70, floor - 110], [b - 95, floor - 34],
      [b + gap + 75, floor - 34], [2440, floor - 34]
    ];
    const enemies = [
      { x: a + gap + 230, y: floor - 32, w: 30, h: 32, minX: a + gap + 175, maxX: a + gap + 260, speed: 44 + index * 3, direction: 1, suppressed: false, label: theme.noise },
      { x: Math.min(b - 265, 1420), y: floor - 32, w: 30, h: 32, minX: Math.min(b - 285, 1390), maxX: Math.min(b - 180, 1500), speed: 49 + index * 3, direction: -1, suppressed: false, label: 'El ruido de fuera' },
      { x: b + gap + 245, y: floor - 32, w: 30, h: 32, minX: b + gap + 190, maxX: b + gap + 270, speed: 47 + index * 3, direction: -1, suppressed: false, label: theme.noise }
    ];
    return {
      ...theme, index, width, height, floor,
      goals: { sparks: 6, built: 2, planted: 2 }, platforms,
      buildSites: [a, b].map(x => ({ x, y: floor, w: gap, h: 22, built: false })),
      treeSites, sparks: sparkPoints.map(([x, y]) => ({ x, y, r: 12, collected: false })), enemies,
      checkpoints: [{ x: 70, y: floor, reached: true }, { x: a + gap + 355, y: floor, reached: false }, { x: b + gap + 360, y: floor, reached: false }],
      fire: { x: 2630, y: floor - 48, w: 42, h: 48 }
    };
  });

  constructor(index = 0) { this.reset(index); }

  reset(index = this.index) {
    this.index = Math.max(0, Math.min(6, Number.isFinite(index) ? Math.trunc(index) : 0));
    this.level = JSON.parse(JSON.stringify(CreativePlatformer.LEVELS[this.index]));
    this.platforms = this.level.platforms;
    this.buildSites = this.level.buildSites;
    this.trees = this.level.treeSites.map(site => ({ ...site, planted: false }));
    this.level.treeSites = this.trees;
    this.level.trees = this.trees;
    this.sparks = this.level.sparks;
    this.enemies = this.level.enemies;
    this.checkpoints = this.level.checkpoints;
    this.fire = this.level.fire;
    this.player = { x: 70, y: this.level.floor - 46, w: 30, h: 46, vx: 0, vy: 0, facing: 1, grounded: true };
    this.state = 'ready';
    this.built = 0; this.planted = 0; this.collected = 0; this.hits = 0;
    this.checkpoint = 0; this.elapsed = 0; this.invulnerable = 0;
    this.jumpHeld = false; this.jumpBuffer = 0; this.coyote = .1;
    this.message = this.level.mission;
    return this.snapshot();
  }

  start() { if (this.state === 'ready') this.state = 'playing'; else if (this.state === 'paused') this.resume(); }
  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.jumpHeld = false; this.jumpBuffer = 0; } }

  nearSite(sites, flag) {
    const p = this.player, px = p.x + p.w / 2, py = p.y + p.h;
    let nearest = null, distance = Infinity;
    for (const site of sites) {
      if (site[flag]) continue;
      const dx = Math.max(site.x - px, 0, px - (site.x + (site.w || 0)));
      const dy = Math.abs(site.y - py);
      const d = Math.hypot(dx, dy);
      if (d < distance && d <= 138) { nearest = site; distance = d; }
    }
    return nearest;
  }

  build() {
    if (this.state !== 'playing') return { ok: false, message: 'Entra al barrio o continúa la partida para construir.' };
    const site = this.nearSite(this.buildSites, 'built');
    if (!site) return this.actionMessage(false, 'Acércate al puente transparente y pulsa Construir.');
    site.built = true; this.built++;
    this.platforms.push({ x: site.x, y: site.y, w: site.w, h: site.h, kind: 'bridge' });
    return this.actionMessage(true, '¡Un camino hecho por ti! Tus ideas pueden abrir espacio.');
  }

  plant() {
    if (this.state !== 'playing') return { ok: false, message: 'Entra al barrio o continúa la partida para plantar.' };
    const site = this.nearSite(this.trees, 'planted');
    if (!site) return this.actionMessage(false, 'Busca una semilla de refugio y acércate para plantar.');
    site.planted = true; this.planted++;
    this.calmEnemies();
    return this.actionMessage(true, 'Tu árbol crea un refugio: las bombas de ruido cercanas se calman.');
  }

  actionMessage(ok, message) { this.message = message; return { ok, message }; }

  calmEnemies() {
    for (const enemy of this.enemies) {
      enemy.suppressed = this.trees.some(tree => tree.planted && Math.abs(tree.x - (enemy.x + enemy.w / 2)) <= 185);
    }
  }

  static intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  update(dt, input = {}) {
    if (this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const amount = Math.min(dt, .08);
    const jump = !!input.jump;
    if (jump && !this.jumpHeld) this.jumpBuffer = .14;
    this.jumpHeld = jump;
    const steps = Math.ceil(amount / (1 / 120)), step = amount / steps;
    for (let i = 0; i < steps && this.state === 'playing'; i++) this.step(step, input);
  }

  step(dt, input) {
    const p = this.player;
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = p.grounded ? .11 : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -555; p.grounded = false; this.coyote = 0; this.jumpBuffer = 0;
    }
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction) {
      p.facing = direction;
      p.vx = Math.max(-235, Math.min(235, p.vx + direction * 2000 * dt));
    } else {
      const drag = 1800 * dt;
      p.vx = Math.abs(p.vx) <= drag ? 0 : p.vx - Math.sign(p.vx) * drag;
    }

    p.x += p.vx * dt;
    p.x = Math.max(0, Math.min(this.level.width - p.w, p.x));
    for (const solid of this.platforms) if (CreativePlatformer.intersects(p, solid)) {
      if (p.vx > 0) p.x = solid.x - p.w;
      else if (p.vx < 0) p.x = solid.x + solid.w;
      p.vx = 0;
    }
    p.vy = Math.min(850, p.vy + 1550 * dt);
    const oldBottom = p.y + p.h, oldTop = p.y;
    p.y += p.vy * dt; p.grounded = false;
    for (const solid of this.platforms) {
      if (p.x + p.w <= solid.x || p.x >= solid.x + solid.w) continue;
      if (p.vy >= 0 && oldBottom <= solid.y + .1 && p.y + p.h >= solid.y) {
        p.y = solid.y - p.h; p.vy = 0; p.grounded = true;
      } else if (p.vy < 0 && oldTop >= solid.y + solid.h - .1 && p.y <= solid.y + solid.h) {
        p.y = solid.y + solid.h; p.vy = 0;
      }
    }
    if (p.y > this.level.height + 80) { this.respawn('Ese salto tuvo otra ruta. Vuelve a tu refugio; lo creado sigue aquí.'); return; }

    for (const enemy of this.enemies) {
      if (!enemy.suppressed) {
        enemy.x += enemy.speed * enemy.direction * dt;
        if (enemy.x > enemy.maxX) { enemy.x = enemy.maxX; enemy.direction = -1; }
        else if (enemy.x < enemy.minX) { enemy.x = enemy.minX; enemy.direction = 1; }
      }
    }
    this.calmEnemies();
    if (this.invulnerable <= 0 && this.enemies.some(enemy => !enemy.suppressed && CreativePlatformer.intersects(p, enemy))) {
      this.respawn('Una bomba de ruido te alcanzó. Respira y prueba otra ruta: tus chispas y obras siguen contigo.'); return;
    }
    for (const spark of this.sparks) {
      if (!spark.collected && CreativePlatformer.intersects(p, { x: spark.x - spark.r, y: spark.y - spark.r, w: spark.r * 2, h: spark.r * 2 })) {
        spark.collected = true; this.collected++;
        this.message = 'Una chispa para tus ideas. No hace falta recogerlas todas para seguir.';
      }
    }
    for (let i = this.checkpoint + 1; i < this.checkpoints.length; i++) {
      const point = this.checkpoints[i];
      if (p.x + p.w / 2 >= point.x && Math.abs(p.y + p.h - point.y) < 120) {
        point.reached = true; this.checkpoint = i;
        this.message = 'Refugio guardado. Puedes pausar: tu camino seguirá aquí durante esta partida.';
      }
    }
    const fireArea = { x: this.fire.x - 38, y: this.fire.y - 65, w: this.fire.w + 76, h: this.fire.h + 100 };
    if (CreativePlatformer.intersects(p, fireArea)) {
      const remaining = this.remaining();
      if (!remaining.sparks && !remaining.built && !remaining.planted) {
        this.state = 'won'; p.vx = 0; p.vy = 0;
        this.message = '¡Encontraste el fuego! Tu pasión tiene un lugar y combustible para seguir creando.';
      } else {
        const items = [];
        if (remaining.sparks) items.push(`${remaining.sparks} chispa${remaining.sparks > 1 ? 's' : ''}`);
        if (remaining.built) items.push(`${remaining.built} puente${remaining.built > 1 ? 's' : ''}`);
        if (remaining.planted) items.push(`${remaining.planted} árbol${remaining.planted > 1 ? 'es' : ''}`);
        this.message = `El fuego te espera. Aún puedes crear: ${items.join(', ')}.`;
      }
    }
  }

  respawn(message) {
    const point = this.checkpoints[this.checkpoint], p = this.player;
    p.x = point.x - p.w / 2; p.y = point.y - p.h;
    p.vx = 0; p.vy = 0; p.grounded = true;
    this.hits++; this.invulnerable = 2; this.jumpBuffer = 0; this.coyote = .11;
    this.message = message;
  }

  remaining() {
    return { sparks: Math.max(0, this.level.goals.sparks - this.collected), built: Math.max(0, this.level.goals.built - this.built), planted: Math.max(0, this.level.goals.planted - this.planted) };
  }

  snapshot() {
    const nearBuild = this.nearSite(this.buildSites, 'built');
    const nearTree = this.nearSite(this.trees, 'planted');
    return {
      index: this.index, state: this.state, player: { ...this.player },
      built: this.built, planted: this.planted, collected: this.collected, hits: this.hits,
      checkpoint: this.checkpoint, elapsed: this.elapsed, invulnerable: this.invulnerable,
      goals: { ...this.level.goals }, remaining: this.remaining(), message: this.message,
      nearBuild: nearBuild ? this.buildSites.indexOf(nearBuild) : null,
      nearTree: nearTree ? this.trees.indexOf(nearTree) : null
    };
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = CreativePlatformer;
