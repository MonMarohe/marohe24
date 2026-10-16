'use strict';

/* The same arcade rules as Australia, with a walkable adobe arena and spider navigation. */
const PeruArcadeBase = typeof module !== 'undefined' && module.exports
  ? require('./australia-engine.js') : globalThis.AustraliaBunnyEngine;

class PeruBunnyEngine extends PeruArcadeBase {
  get spiders() { return this.snakes; }
  get spiderGoal() { return this.snakeGoal; }

  loadWave(wave) {
    // Parent reset places Bunny before installing the next arena's solid walls.
    this.walls = [];
    super.loadWave(wave);
    this.waveName = ['El patio de adobe', 'El corredor de los relieves', 'El recinto de la llama'][wave - 1];
    const layouts = [
      [[230, 130, 38, 310], [692, 130, 38, 310], [268, 255, 150, 38], [542, 255, 150, 38]],
      [[150, 180, 255, 38], [555, 180, 255, 38], [350, 218, 38, 230], [572, 218, 38, 230],
        [150, 448, 238, 38], [572, 448, 238, 38]],
      [[180, 120, 240, 38], [540, 120, 240, 38], [180, 158, 38, 330], [742, 158, 38, 330],
        [180, 488, 220, 38], [560, 488, 220, 38], [350, 260, 38, 125], [572, 260, 38, 125]]
    ];
    this.walls = layouts[wave - 1].map(([x, y, w, h]) => ({ x, y, w, h }));
    this.banner = `Expedición ${wave} · ${this.waveName}`;
    this.fire.x = 480; this.fire.y = 84;
    this.installSolidPosition(this.player, 28, 42, 932, 612);
    const places = [[120, 100], [480, 92], [840, 100], [110, 315], [480, 290], [850, 315],
      [120, 550], [480, 550], [840, 550], [480, 200]];
    this.hearts.forEach((heart, i) => {
      heart.x = places[i][0] + this.jitter(7); heart.y = places[i][1] + this.jitter(7);
    });
    this.snakes.forEach(spider => {
      spider.id = spider.id.replace('snake-', 'spider-');
      this.installSolidPosition(spider, 24, 34, 936, 616);
    });
    this.allies = [
      { id: 'llama-1', kind: 'llama', x: 100, y: 400, r: 24, available: true, cooldown: 0 },
      { id: 'llama-2', kind: 'llama', x: 860, y: 400, r: 24, available: true, cooldown: 0 }
    ];
    this.buildNavigation();
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
    for (const spider of this.spiders) {
      const d = Math.hypot(spider.x - this.player.x, spider.y - this.player.y);
      if (d < distance && this.segmentWall(this.player.x, this.player.y, spider.x, spider.y, 5) === null) {
        target = spider; distance = d;
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

  buildNavigation() {
    this.cell = 24; this.columns = 40; this.rows = 27;
    this.nodes = Array.from({ length: this.columns * this.rows }, (_, id) => {
      const x = (id % this.columns) * this.cell + 12, y = Math.floor(id / this.columns) * this.cell + 12;
      return { id, x, y, open: x >= 28 && x <= 932 && y >= 42 && y <= 612 && !this.circleHitsWall(x, y, 23) };
    });
    this.navigationTarget = -1; this.flow = new Int16Array(this.nodes.length).fill(-1);
  }

  nearestNode(x, y, radius = 17) {
    let found = -1, distance = Infinity;
    const column = Math.floor(x / this.cell), row = Math.floor(y / this.cell);
    const nearby = [];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = column + dx, ny = row + dy;
      if (nx >= 0 && nx < this.columns && ny >= 0 && ny < this.rows) nearby.push(this.nodes[ny * this.columns + nx]);
    }
    for (const node of nearby) {
      if (!node.open) continue;
      const d = (x - node.x) ** 2 + (y - node.y) ** 2;
      if (d < distance && this.segmentWall(x, y, node.x, node.y, radius) === null) { distance = d; found = node.id; }
    }
    return found;
  }

  neighbours(id) {
    const x = id % this.columns, y = Math.floor(id / this.columns), found = [];
    if (x > 0) found.push(id - 1); if (x < this.columns - 1) found.push(id + 1);
    if (y > 0) found.push(id - this.columns); if (y < this.rows - 1) found.push(id + this.columns);
    return found.filter(next => this.nodes[next].open);
  }

  refreshFlow() {
    const target = this.nearestNode(this.player.x, this.player.y, this.player.r);
    if (target === this.navigationTarget) return;
    this.navigationTarget = target; this.flow.fill(-1);
    if (target < 0) return;
    const queue = [target]; this.flow[target] = 0;
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head];
      for (const next of this.neighbours(id)) if (this.flow[next] < 0) {
        this.flow[next] = this.flow[id] + 1; queue.push(next);
      }
    }
  }

  spiderDirection(spider) {
    if (this.segmentWall(spider.x, spider.y, this.player.x, this.player.y, spider.r) === null) {
      spider.navId = null;
      return { x: this.player.x, y: this.player.y };
    }
    let here = spider.navId;
    if (!Number.isInteger(here) || this.segmentWall(spider.x, spider.y, this.nodes[here].x, this.nodes[here].y, spider.r) !== null) {
      here = this.nearestNode(spider.x, spider.y, spider.r);
    }
    if (here < 0) return null;
    // Reach a safe cell centre before turning a corner, avoiding diagonal wall cuts.
    const node = this.nodes[here];
    if (Math.hypot(node.x - spider.x, node.y - spider.y) > 3) { spider.navId = here; return node; }
    let next = here;
    for (const id of this.neighbours(here)) if (this.flow[id] >= 0 && (this.flow[next] < 0 || this.flow[id] < this.flow[next])) next = id;
    spider.navId = next;
    return this.nodes[next];
  }

  step(dt, input) {
    this.refreshFlow();
    const speeds = new Map(), bulletStarts = new Map(this.bullets.map(b => [b.id, { x: b.x, y: b.y }]));
    const allyCooldowns = this.allies.map(a => a.cooldown);
    for (const spider of this.spiders) {
      speeds.set(spider.id, spider.speed);
      const target = this.spiderDirection(spider);
      if (target) {
        const dx = target.x - spider.x, dy = target.y - spider.y, length = Math.hypot(dx, dy);
        if (length > 0.001) {
          const distance = Math.min(length, spider.speed * dt);
          spider.x += dx / length * distance; spider.y += dy / length * distance;
        }
      }
      // Parent handles knockback, damage, healing, pickups and both flame gates.
      spider.speed = 0;
    }
    super.step(dt, input);
    for (const spider of this.spiders) if (speeds.has(spider.id)) spider.speed = speeds.get(spider.id);
    this.bullets = this.bullets.filter(bullet => {
      const start = bulletStarts.get(bullet.id);
      if (this.circleHitsWall(bullet.x, bullet.y, bullet.r) ||
          (start && this.segmentWall(start.x, start.y, bullet.x, bullet.y, bullet.r) !== null)) {
        this.emit(bullet.x, bullet.y, '#edbd7c', 3, 'spark'); return false;
      }
      return bullet.life > 0;
    });
    this.allies.forEach((ally, i) => {
      if (ally.cooldown > allyCooldowns[i]) this.banner = 'Tu llama amiga · +2 vida';
    });
  }

  progress() {
    const { snakeGoal, snakesRemaining, snakes, ...progress } = super.progress();
    return { ...progress, spiderGoal: snakeGoal, spidersRemaining: snakesRemaining, spiders: snakes };
  }
}

if (typeof globalThis !== 'undefined') globalThis.PeruBunnyEngine = PeruBunnyEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = PeruBunnyEngine;
