'use strict';

/* A small deterministic simulation. Rendering and browser input live in australia-ui.js. */
class AustraliaBunnyEngine {
  constructor(random = Math.random) {
    this.width = 960;
    this.height = 640;
    this.seed = typeof random === 'number' ? random >>> 0 : null;
    this.randomSource = typeof random === 'function' ? random : Math.random;
    this.reset();
  }

  static seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let n = state;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  reset() {
    this.random = this.seed === null ? this.randomSource : AustraliaBunnyEngine.seededRandom(this.seed);
    this.state = 'ready';
    this.elapsed = 0;
    this.ids = 0;
    this.stats = { hearts: 0, snakes: 0, shots: 0, score: 0 };
    this.player = { id: 'bunny', x: 480, y: 450, r: 18, radius: 18,
      health: 5, maxHealth: 5, invulnerable: 0, direction: { x: 0, y: -1 } };
    this.loadWave(1);
    return this;
  }

  loadWave(wave) {
    this.wave = wave;
    this.waveName = ['El bosque de eucaliptos', 'La selva de las mil ideas', 'El corazón de Australia'][wave - 1];
    this.goal = [6, 8, 10][wave - 1];
    this.snakeGoal = [4, 6, 8][wave - 1];
    this.waveHearts = 0;
    this.waveDefeated = 0;
    this.waveElapsed = 0;
    this.shotCooldown = 0;
    this.player.x = 480;
    this.player.y = 450;
    this.player.direction = { x: 0, y: -1 };
    this.player.invulnerable = 1.6;
    this.bullets = [];
    this.particles = [];
    this.fire = { id: 'flame', x: 480, y: 100, r: 24,
      visible: false, unlocked: false, collected: false };
    this.banner = `Expedición ${wave} · ${this.waveName}`;
    this.bannerTimer = 3;
    // Every collectible is on open ground; plants in the renderer are decorative.
    this.hearts = Array.from({ length: this.goal }, (_, i) => {
      const angle = (i / this.goal) * Math.PI * 2 - Math.PI / 2;
      return { id: `heart-${++this.ids}`, x: 480 + Math.cos(angle) * 315 + this.jitter(15),
        y: 315 + Math.sin(angle) * 205 + this.jitter(15), r: 14,
        phase: this.random() * Math.PI * 2 };
    });
    const entries = [[68, 72], [892, 72], [68, 570], [892, 570],
      [260, 62], [700, 62], [66, 320], [894, 320]];
    this.snakes = Array.from({ length: this.snakeGoal }, (_, i) => {
      const [x, y] = entries[i];
      return { id: `snake-${++this.ids}`, x: x + this.jitter(10), y: y + this.jitter(10),
        r: 17, hp: wave === 3 ? 3 : 2, maxHp: wave === 3 ? 3 : 2,
        speed: 65 + wave * 8 + this.random() * 8, phase: this.random() * Math.PI * 2,
        angle: 0, hitTimer: 0, knockbackX: 0, knockbackY: 0 };
    });
    this.allies = [
      { id: 'koala', kind: 'koala', x: 150, y: 330, r: 24, available: true, cooldown: 0 },
      { id: 'kangaroo', kind: 'kangaroo', x: 810, y: 335, r: 25, available: true, cooldown: 0 }
    ];
  }

  jitter(amount) { return (this.random() * 2 - 1) * amount; }

  start() {
    if (this.state === 'won' || this.state === 'over') this.reset();
    if (this.state === 'ready' || this.state === 'paused') this.state = 'playing';
    return this.state;
  }
  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') this.state = 'playing'; }

  nextWave() {
    if (this.state !== 'playing' || !this.fire.unlocked || !this.fire.collected || this.wave >= 3) return false;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
    this.loadWave(this.wave + 1);
    return true;
  }

  aim(aimX, aimY) {
    const direction = this.player.direction;
    if (Number.isFinite(aimX) && Number.isFinite(aimY) && Math.hypot(aimX, aimY) > 0.001) {
      const length = Math.hypot(aimX, aimY);
      return { x: aimX / length, y: aimY / length };
    }
    // Thumb controls need no second aiming stick: the nearest snake receives the shot.
    let nearest = null, distance = Infinity;
    for (const snake of this.snakes) {
      const d = Math.hypot(snake.x - this.player.x, snake.y - this.player.y);
      if (d < distance) { nearest = snake; distance = d; }
    }
    if (nearest && distance > 0.001) {
      return { x: (nearest.x - this.player.x) / distance, y: (nearest.y - this.player.y) / distance };
    }
    return { x: direction.x, y: direction.y };
  }

  shoot(aimX, aimY) {
    if (this.state !== 'playing' || this.shotCooldown > 0) return false;
    const direction = this.aim(aimX, aimY);
    this.player.direction = direction;
    this.shotCooldown = 0.2;
    this.stats.shots++;
    this.bullets.push({ id: `shot-${++this.ids}`, x: this.player.x + direction.x * 23,
      y: this.player.y + direction.y * 23, vx: direction.x * 700, vy: direction.y * 700,
      r: 5, life: 1.4 });
    this.emit(this.player.x + direction.x * 24, this.player.y + direction.y * 24, '#fff0aa', 4, 'spark');
    return true;
  }

  update(dt, input = {}) {
    if (this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // Tab resume and frame stalls cannot jump the player through an entire arena.
    let remaining = Math.min(dt, 0.12);
    while (remaining > 1e-8 && this.state === 'playing') {
      const step = Math.min(remaining, 1 / 120);
      this.step(step, input || {});
      remaining -= step;
    }
  }

  step(dt, input) {
    this.elapsed += dt;
    this.waveElapsed += dt;
    this.bannerTimer = Math.max(0, this.bannerTimer - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    let dx = Number.isFinite(input.dx) ? input.dx : 0;
    let dy = Number.isFinite(input.dy) ? input.dy : 0;
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    if (length > 0.001) this.player.direction = { x: dx / Math.hypot(dx, dy), y: dy / Math.hypot(dx, dy) };
    this.player.x = this.clamp(this.player.x + dx * 225 * dt, 28, this.width - 28);
    this.player.y = this.clamp(this.player.y + dy * 225 * dt, 42, this.height - 28);
    if (input.fire || input.shoot) this.shoot(input.aimX, input.aimY);

    for (const snake of this.snakes) {
      snake.hitTimer = Math.max(0, snake.hitTimer - dt);
      const sx = this.player.x - snake.x, sy = this.player.y - snake.y;
      const distance = Math.hypot(sx, sy);
      if (distance > 0.001) {
        snake.angle = Math.atan2(sy, sx);
        snake.x += (sx / distance * snake.speed + snake.knockbackX) * dt;
        snake.y += (sy / distance * snake.speed + snake.knockbackY) * dt;
      }
      snake.knockbackX *= Math.exp(-12 * dt);
      snake.knockbackY *= Math.exp(-12 * dt);
      snake.x = this.clamp(snake.x, 24, this.width - 24);
      snake.y = this.clamp(snake.y, 34, this.height - 24);
    }

    for (const bullet of this.bullets) {
      const endX = bullet.x + bullet.vx * dt, endY = bullet.y + bullet.vy * dt;
      let target = null, closest = Infinity;
      for (const snake of this.snakes) {
        if (snake.hp <= 0) continue;
        const hit = this.segmentCircle(bullet.x, bullet.y, endX, endY, snake.x, snake.y, snake.r + bullet.r);
        if (hit !== null && hit < closest) { target = snake; closest = hit; }
      }
      if (target) {
        target.hp--;
        target.hitTimer = 0.16;
        target.knockbackX = bullet.vx * 0.24;
        target.knockbackY = bullet.vy * 0.24;
        bullet.life = 0;
        this.emit(target.x, target.y, target.hp > 0 ? '#fbc860' : '#91e4bc', 8, 'spark');
        if (target.hp <= 0) {
          this.waveDefeated++;
          this.stats.snakes++;
          this.stats.score += 100;
        }
      } else {
        bullet.x = endX;
        bullet.y = endY;
        bullet.life -= dt;
      }
    }
    this.snakes = this.snakes.filter(snake => snake.hp > 0);
    this.bullets = this.bullets.filter(bullet => bullet.life > 0 &&
      bullet.x > -20 && bullet.x < this.width + 20 && bullet.y > -20 && bullet.y < this.height + 20);

    for (const heart of this.hearts) {
      if (Math.hypot(heart.x - this.player.x, heart.y - this.player.y) <= heart.r + this.player.r) {
        heart.collected = true;
        this.waveHearts++;
        this.stats.hearts++;
        this.stats.score += 25;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        this.emit(heart.x, heart.y, '#ff8eae', 10, 'heart');
      }
    }
    this.hearts = this.hearts.filter(heart => !heart.collected);
    for (const ally of this.allies) {
      ally.cooldown = Math.max(0, ally.cooldown - dt);
      ally.available = ally.cooldown <= 0;
      if (ally.available && this.player.health < this.player.maxHealth &&
          Math.hypot(ally.x - this.player.x, ally.y - this.player.y) <= ally.r + this.player.r + 20) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
        this.player.invulnerable = Math.max(this.player.invulnerable, 1.2);
        ally.cooldown = 12;
        ally.available = false;
        this.banner = ally.kind === 'koala' ? 'Un abrazo de koala · +2 vida' : 'Tu amigo canguro · +2 vida';
        this.bannerTimer = 2;
        this.emit(ally.x, ally.y - 20, '#ff8eae', 12, 'heart');
      }
    }
    if (this.player.invulnerable <= 0) {
      const snake = this.snakes.find(enemy => Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) < enemy.r + this.player.r);
      if (snake) {
        this.player.health--;
        this.player.invulnerable = 1.5;
        const direction = this.aim(this.player.x - snake.x, this.player.y - snake.y);
        this.player.x = this.clamp(this.player.x + direction.x * 22, 28, this.width - 28);
        this.player.y = this.clamp(this.player.y + direction.y * 22, 42, this.height - 28);
        this.emit(this.player.x, this.player.y, '#ff84ae', 12, 'spark');
        if (this.player.health <= 0) {
          this.player.health = 0;
          this.state = 'over';
          this.banner = 'Tu aventura puede volver a empezar.';
          this.bannerTimer = 10;
        }
      }
    }
    if (this.state === 'playing' && !this.fire.unlocked && this.waveHearts >= this.goal && this.waveDefeated >= this.snakeGoal) {
      this.fire.visible = true;
      this.fire.unlocked = true;
      this.banner = this.wave < 3 ? 'La llama abre el camino · acércate' : 'Tu fuego creativo te espera · recoge la llama';
      this.bannerTimer = 8;
      this.emit(this.fire.x, this.fire.y, '#ffc76a', 24, 'spark');
    }
    this.particles = this.particles.filter(particle => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 30 * dt;
      return particle.life > 0;
    });
    if (this.state === 'playing' && this.fire.unlocked && !this.fire.collected &&
        Math.hypot(this.fire.x - this.player.x, this.fire.y - this.player.y) <= this.fire.r + this.player.r) {
      this.fire.collected = true;
      this.stats.score += 250;
      if (this.wave < 3) this.nextWave();
      else {
        this.state = 'won';
        this.banner = 'La llama es tuya. Sigue creando.';
        this.bannerTimer = 10;
        this.emit(this.fire.x, this.fire.y, '#ffc76a', 36, 'heart');
      }
    }
  }

  emit(x, y, color, count, type) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2, speed = 35 + this.random() * 105;
      const life = 0.25 + this.random() * 0.4;
      this.particles.push({ id: `particle-${++this.ids}`, x, y, vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed, r: 2 + this.random() * 3, life, maxLife: life, color, type });
    }
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  segmentCircle(ax, ay, bx, by, cx, cy, radius) {
    const dx = bx - ax, dy = by - ay, fx = ax - cx, fy = ay - cy;
    const c = fx * fx + fy * fy - radius * radius;
    if (c <= 0) return 0;
    const a = dx * dx + dy * dy;
    if (a <= 1e-12) return null;
    const b = 2 * (fx * dx + fy * dy), discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant), first = (-b - root) / (2 * a), last = (-b + root) / (2 * a);
    if (first >= 0 && first <= 1) return first;
    return last >= 0 && last <= 1 ? last : null;
  }

  progress() {
    return { state: this.state, wave: this.wave, waveName: this.waveName,
      health: this.player.health, maxHealth: this.player.maxHealth,
      waveHearts: this.waveHearts, goal: this.goal, waveDefeated: this.waveDefeated,
      snakeGoal: this.snakeGoal, snakesRemaining: this.snakes.length,
      fireUnlocked: this.fire.unlocked, fireCollected: this.fire.collected,
      player: { x: this.player.x, y: this.player.y }, ...this.stats };
  }
}

if (typeof globalThis !== 'undefined') globalThis.AustraliaBunnyEngine = AustraliaBunnyEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = AustraliaBunnyEngine;
