'use strict';

/* Canyon expedition: sandstone cover on foot, eagles overhead, bears as allies. */
const USAArcadeBase = typeof module !== 'undefined' && module.exports
  ? require('./australia-engine.js') : globalThis.AustraliaBunnyEngine;

class USABunnyEngine extends USAArcadeBase {
  get eagles() { return this.snakes; }
  get eagleGoal() { return this.snakeGoal; }

  loadWave(wave) {
    this.walls = [];
    super.loadWave(wave);
    this.waveName = ['La entrada del cañón', 'El sendero de las mesetas', 'El corazón del cañón'][wave - 1];
    const layouts = [
      [[230, 170, 105, 150], [625, 170, 105, 150], [405, 380, 150, 70]],
      [[205, 160, 105, 230], [650, 160, 105, 230], [405, 245, 150, 75]],
      [[200, 165, 140, 90], [620, 165, 140, 90], [200, 385, 140, 90],
        [620, 385, 140, 90], [420, 260, 120, 110]]
    ];
    this.walls = layouts[wave - 1].map(([x, y, w, h], i) => ({ x, y, w, h, tier: i % 3 }));
    this.obstacles = [];
    this.player.x = 480; this.player.y = 520;
    this.installSolidPosition(this.player, 28, 42, 932, 612);
    this.banner = `Expedición ${wave} · ${this.waveName}`;
    this.fire.x = 480; this.fire.y = 88;
    const places = [[120, 100], [480, 110], [840, 100], [120, 330], [840, 330],
      [120, 550], [480, 575], [840, 550], [375, 210], [585, 210]];
    this.hearts.forEach((heart, i) => {
      heart.x = places[i][0] + this.jitter(6); heart.y = places[i][1] + this.jitter(6);
    });
    this.snakes.forEach(eagle => {
      eagle.id = eagle.id.replace('snake-', 'eagle-');
      eagle.kind = 'eagle';
      eagle.speed = 66 + wave * 7 + this.random() * 7;
    });
    this.allies = [
      { id: 'bear-1', kind: 'bear', x: 100, y: 425, r: 26, available: true, cooldown: 0 },
      { id: 'bear-2', kind: 'bear', x: 860, y: 425, r: 26, available: true, cooldown: 0 }
    ];
  }

  circleHitsWall(x, y, radius) {
    return this.walls.some(wall => {
      const cx = this.clamp(x, wall.x, wall.x + wall.w), cy = this.clamp(y, wall.y, wall.y + wall.h);
      return (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2 - 1e-7;
    });
  }

  installSolidPosition(entity, minX, minY, maxX, maxY) {
    if (entity.solidPosition) return;
    let x = entity.x, y = entity.y;
    const setAxis = (axis, value) => {
      if (!Number.isFinite(value)) return;
      const previous = axis === 'x' ? x : y, other = axis === 'x' ? y : x;
      let next = this.clamp(value, axis === 'x' ? minX : minY, axis === 'x' ? maxX : maxY);
      const positive = next > previous;
      for (const wall of this.walls) {
        const low = axis === 'x' ? wall.y : wall.x, high = low + (axis === 'x' ? wall.h : wall.w);
        const offset = Math.abs(other - this.clamp(other, low, high));
        if (offset >= entity.r) continue;
        const reach = Math.sqrt(entity.r ** 2 - offset ** 2);
        const start = (axis === 'x' ? wall.x : wall.y) - reach;
        const end = (axis === 'x' ? wall.x + wall.w : wall.y + wall.h) + reach;
        if (positive && previous <= start + 1e-7 && next > start) next = Math.min(next, start);
        if (!positive && previous >= end - 1e-7 && next < end) next = Math.max(next, end);
      }
      if (axis === 'x') x = next; else y = next;
    };
    Object.defineProperties(entity, {
      x: { enumerable: true, configurable: true, get: () => x, set: value => setAxis('x', value) },
      y: { enumerable: true, configurable: true, get: () => y, set: value => setAxis('y', value) },
      solidPosition: { value: true }
    });
  }

  segmentWall(ax, ay, bx, by, padding = 0) {
    let closest = null;
    for (const wall of this.walls) {
      let enter = 0, leave = 1;
      for (const [a, delta, low, high] of [[ax, bx - ax, wall.x - padding, wall.x + wall.w + padding],
        [ay, by - ay, wall.y - padding, wall.y + wall.h + padding]]) {
        if (Math.abs(delta) < 1e-9) {
          if (a < low || a > high) { enter = 2; break; }
        } else {
          const first = (low - a) / delta, last = (high - a) / delta;
          enter = Math.max(enter, Math.min(first, last)); leave = Math.min(leave, Math.max(first, last));
        }
      }
      if (enter <= leave && enter <= 1 && leave >= 0 && (closest === null || enter < closest)) closest = enter;
    }
    return closest;
  }

  aim(aimX, aimY) {
    if (Number.isFinite(aimX) && Number.isFinite(aimY) && Math.hypot(aimX, aimY) > 0.001) return super.aim(aimX, aimY);
    let target = null, distance = Infinity;
    for (const eagle of this.eagles) {
      const d = Math.hypot(eagle.x - this.player.x, eagle.y - this.player.y);
      if (d < distance && this.segmentWall(this.player.x, this.player.y, eagle.x, eagle.y, 5) === null) {
        target = eagle; distance = d;
      }
    }
    return target && distance > 0.001
      ? { x: (target.x - this.player.x) / distance, y: (target.y - this.player.y) / distance }
      : { ...this.player.direction };
  }

  shoot(aimX, aimY) {
    if (!super.shoot(aimX, aimY)) return false;
    const bullet = this.bullets[this.bullets.length - 1];
    if (this.segmentWall(this.player.x, this.player.y, bullet.x, bullet.y, bullet.r) !== null) bullet.life = 0;
    return true;
  }

  segmentCircle(ax, ay, bx, by, cx, cy, radius) {
    const hit = super.segmentCircle(ax, ay, bx, by, cx, cy, radius);
    const wall = this.segmentWall(ax, ay, bx, by, 5);
    return hit !== null && (wall === null || hit < wall) ? hit : null;
  }

  step(dt, input) {
    const wave = this.wave;
    const bulletStarts = new Map(this.bullets.map(b => [b.id, { x: b.x, y: b.y }]));
    const allyCooldowns = this.allies.map(a => a.cooldown);
    // Eagles use the original smooth chase; flying enemies do not collide with rock mesas.
    super.step(dt, input);
    this.bullets = this.bullets.filter(bullet => {
      const start = bulletStarts.get(bullet.id);
      if (this.circleHitsWall(bullet.x, bullet.y, bullet.r) ||
          (start && this.segmentWall(start.x, start.y, bullet.x, bullet.y, bullet.r) !== null)) {
        this.emit(bullet.x, bullet.y, '#f7c58e', 3, 'spark'); return false;
      }
      return bullet.life > 0;
    });
    if (wave === this.wave) this.allies.forEach((ally, i) => {
      if (ally.cooldown > allyCooldowns[i]) this.banner = 'Tu amigo oso · +2 vida';
    });
  }

  progress() {
    const { snakeGoal, snakesRemaining, snakes, ...progress } = super.progress();
    return { ...progress, eagleGoal: snakeGoal, eaglesRemaining: snakesRemaining, eagles: snakes };
  }
}

if (typeof globalThis !== 'undefined') globalThis.USABunnyEngine = USABunnyEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = USABunnyEngine;
