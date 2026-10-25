// A lightweight football simulation in pitch metres (105 x 68).
// Home attacks towards x = 105. Possession share biases interceptions,
// and real goals can be queued so the animation scores when the match does.

export const PITCH_W = 105;
export const PITCH_H = 68;

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function formationSpots(formation) {
  let lines = String(formation || '').split('-').map(Number).filter((n) => n > 0);
  if (lines.reduce((a, b) => a + b, 0) !== 10) lines = [4, 3, 3];
  const spots = [[5, 34]];
  lines.forEach((n, li) => {
    const x = 18 + (li * 38) / Math.max(1, lines.length - 1);
    const width = Math.min(50, n * 14);
    for (let k = 0; k < n; k++) {
      const y = n === 1 ? 34 : 34 - width / 2 + (k * width) / (n - 1);
      spots.push([x, y]);
    }
  });
  return spots;
}

export class MatchSim {
  constructor({ possession = 0.5, formations = [], goalChance = 0.1, tempo = 1 } = {}) {
    this.possession = possession;
    this.goalChance = goalChance;
    this.tempo = tempo;
    this.time = 0;
    this.players = [];
    this.listeners = {};
    this.queue = [];
    this.trail = [];
    this.setFormations(formations[0], formations[1]);
    this.kickoff(Math.random() < 0.5 ? 0 : 1);
  }

  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
  }

  emit(evt, data) {
    (this.listeners[evt] || []).forEach((fn) => fn(data));
  }

  setFormations(home, away) {
    const make = (team, spots) =>
      spots.map(([x, y], i) => {
        const bx = team === 0 ? x : PITCH_W - x;
        const by = team === 0 ? y : PITCH_H - y;
        return { team, gk: i === 0, bx, by, x: bx, y: by, seed: Math.random() * 10 };
      });
    this.players = [...make(0, formationSpots(home)), ...make(1, formationSpots(away))];
  }

  dir(team) {
    return team === 0 ? 1 : -1;
  }

  share(team) {
    return team === 0 ? this.possession : 1 - this.possession;
  }

  kickoff(team) {
    this.owner = team;
    this.ball = { x: PITCH_W / 2, y: PITCH_H / 2, z: 0 };
    this.players.forEach((p) => {
      // Everyone back in their own half for the restart
      p.x = p.team === 0 ? Math.min(p.bx, 50) : Math.max(p.bx, 55);
      p.y = p.by;
    });
    const mates = this.players.filter((p) => p.team === team && !p.gk);
    this.carrier = mates.reduce((a, b) => (dist(a, this.ball) < dist(b, this.ball) ? a : b));
    this.carrier.x = this.ball.x - this.dir(team) * 0.8;
    this.carrier.y = this.ball.y;
    this.phase = 'dribble';
    this.timer = rand(0.6, 1.2);
    this.flight = null;
  }

  /** Make `team` (0 home / 1 away) score as soon as possible. */
  queueGoal(team, label = '') {
    this.queue.push({ team, label });
    if (this.phase !== 'celebrate') this.startQueuedAttack();
  }

  startQueuedAttack() {
    const next = this.queue[0];
    if (!next) return;
    const d = this.dir(next.team);
    const forwards = this.players.filter((p) => p.team === next.team && !p.gk).sort((a, b) => d * (b.bx - a.bx));
    this.owner = next.team;
    this.carrier = forwards[0];
    this.carrier.x = PITCH_W / 2 + d * 30;
    this.carrier.y = rand(22, 46);
    this.ball = { x: this.carrier.x + d * 0.8, y: this.carrier.y, z: 0 };
    this.phase = 'dribble';
    this.timer = 0.9;
    this.flight = null;
    this.forced = next;
  }

  get danger() {
    const d = this.dir(this.owner);
    const goalX = d > 0 ? PITCH_W : 0;
    return Math.abs(goalX - this.ball.x) < 30 && this.phase !== 'celebrate';
  }

  step(dt) {
    dt = Math.min(dt, 0.05) * this.tempo;
    this.time += dt;
    this.updateBall(dt);
    this.updatePlayers(dt);
    this.trail.push({ x: this.ball.x, y: this.ball.y, z: this.ball.z });
    if (this.trail.length > 14) this.trail.shift();
  }

  updatePlayers(dt) {
    const ball = this.ball;
    const chasers = [0, 1].map((team) => {
      if (team === this.owner && this.phase === 'dribble') return null;
      const cands = this.players.filter((p) => p.team === team && !p.gk && p !== this.carrier);
      return cands.reduce((a, b) => (dist(a, ball) < dist(b, ball) ? a : b));
    });

    this.players.forEach((p) => {
      if (p === this.carrier && this.phase === 'dribble') return;
      const d = this.dir(p.team);
      const attacking = this.owner === p.team;
      let tx;
      let ty;
      if (p.gk) {
        const goalX = d > 0 ? 0 : PITCH_W;
        const pressure = 1 - Math.min(1, Math.abs(ball.x - goalX) / 60);
        tx = goalX + d * (1.5 + pressure * 3);
        ty = PITCH_H / 2 + (ball.y - PITCH_H / 2) * (0.12 + pressure * 0.2);
      } else if (chasers[p.team] === p && this.phase !== 'celebrate') {
        tx = ball.x;
        ty = ball.y;
      } else {
        const shift = (ball.x - PITCH_W / 2) * 0.55 + (attacking ? d * 7 : -d * 3);
        tx = p.bx + shift + Math.sin(this.time * 0.7 + p.seed) * 1.4;
        ty = p.by + (ball.y - PITCH_H / 2) * 0.28 + Math.cos(this.time * 0.6 + p.seed) * 1.2;
      }
      if (this.phase === 'celebrate') {
        tx = p.team === this.scorer ? this.ball.x - this.dir(p.team) * rand(4, 12) : p.bx;
        ty = p.team === this.scorer ? this.ball.y + Math.sin(p.seed) * 8 : p.by;
      }
      tx = clampN(tx, 1.5, PITCH_W - 1.5);
      ty = clampN(ty, 1.5, PITCH_H - 1.5);
      const speed = chasers[p.team] === p ? 7.5 : p.gk ? 4 : 5.5;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.05) {
        const stepLen = Math.min(len, speed * dt);
        p.x += (dx / len) * stepLen;
        p.y += (dy / len) * stepLen;
      }
    });
  }

  updateBall(dt) {
    if (this.phase === 'dribble') {
      const c = this.carrier;
      const d = this.dir(this.owner);
      const goalY = PITCH_H / 2;
      const ty = c.y + (goalY - c.y) * 0.02 + Math.sin(this.time * 1.7 + c.seed) * 0.6;
      c.x = clampN(c.x + d * 5 * dt, 2, PITCH_W - 2);
      c.y = clampN(ty, 3, PITCH_H - 3);
      this.ball.x = c.x + d * 0.8;
      this.ball.y = c.y;
      this.ball.z = 0;
      this.timer -= dt;
      if (this.timer <= 0) this.decide();
      return;
    }
    if (this.phase === 'celebrate' || this.phase === 'restart') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.phase === 'celebrate') {
          this.kickoff(1 - this.scorer);
          if (this.queue.length) this.startQueuedAttack();
        } else {
          this.phase = 'dribble';
          this.timer = rand(0.5, 1);
        }
      }
      return;
    }
    // pass or shot in flight
    const f = this.flight;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    const e = 1 - (1 - k) * (1 - k);
    this.ball.x = f.from.x + (f.to.x - f.from.x) * e;
    this.ball.y = f.from.y + (f.to.y - f.from.y) * e;
    this.ball.z = Math.sin(Math.PI * k) * f.loft;
    if (k >= 1) this.land();
  }

  decide() {
    const d = this.dir(this.owner);
    const goalX = d > 0 ? PITCH_W : 0;
    const toGoal = Math.abs(goalX - this.ball.x);
    const forcing = this.forced && this.forced.team === this.owner;
    if ((forcing && toGoal < 32) || (!forcing && toGoal < 24 && Math.random() < 0.45)) return this.shoot();
    this.pass();
  }

  pass() {
    const team = this.owner;
    const d = this.dir(team);
    const c = this.carrier;
    const mates = this.players.filter((p) => p.team === team && p !== c && !p.gk);
    const scored = mates
      .map((p) => {
        const fwd = d * (p.x - c.x);
        const len = dist(p, c);
        const score = (fwd > -6 ? 1 : 0.25) * (len > 7 && len < 38 ? 1 : 0.2) * (1 + Math.max(0, fwd) / 20) * Math.random();
        return { p, score };
      })
      .sort((a, b) => b.score - a.score);
    const recv = scored[0]?.p || mates[0];
    const lead = { x: clampN(recv.x + d * 2, 2, PITCH_W - 2), y: recv.y };
    const len = dist(c, lead);
    const forcing = this.forced && this.forced.team === team;
    const interceptChance = forcing ? 0 : 0.04 + 0.22 * (1 - this.share(team));
    let target = recv;
    let to = lead;
    if (Math.random() < interceptChance) {
      const mid = { x: (c.x + lead.x) / 2, y: (c.y + lead.y) / 2 };
      const opp = this.players.filter((p) => p.team !== team && !p.gk);
      target = opp.reduce((a, b) => (dist(a, mid) < dist(b, mid) ? a : b));
      to = { x: target.x, y: target.y };
    }
    this.phase = 'pass';
    this.flight = { from: { ...this.ball }, to, dur: Math.max(0.35, dist(this.ball, to) / 21), t: 0, loft: len > 25 ? 2.6 : 0.3, target };
  }

  shoot() {
    const d = this.dir(this.owner);
    const goalX = d > 0 ? PITCH_W + 0.6 : -0.6;
    const forcing = this.forced && this.forced.team === this.owner;
    const onTarget = forcing || Math.random() < 0.55;
    const y = onTarget ? rand(30.8, 37.2) : Math.random() < 0.5 ? rand(24, 29.5) : rand(38.5, 44);
    const to = { x: goalX, y };
    this.phase = 'shot';
    this.flight = { from: { ...this.ball }, to, dur: Math.max(0.3, dist(this.ball, to) / 30), t: 0, loft: rand(0.4, 1.8), onTarget };
    this.emit('shot', { team: this.owner });
  }

  land() {
    const f = this.flight;
    if (this.phase === 'pass') {
      const recv = f.target;
      if (recv.team !== this.owner) this.emit('turnover', { team: recv.team });
      this.owner = recv.team;
      this.carrier = recv;
      recv.x = clampN(this.ball.x - this.dir(recv.team) * 0.8, 2, PITCH_W - 2);
      recv.y = this.ball.y;
      this.phase = 'dribble';
      this.timer = rand(0.5, 1.6);
      return;
    }
    // shot arrived
    const team = this.owner;
    const forcing = this.forced && this.forced.team === team;
    if (forcing || (f.onTarget && Math.random() < this.goalChance)) {
      this.scorer = team;
      const label = forcing ? this.forced.label : '';
      if (forcing) {
        this.queue.shift();
        this.forced = null;
      }
      this.phase = 'celebrate';
      this.timer = 2.8;
      this.emit('goal', { team, label });
      return;
    }
    // saved or wide: the keeper restarts play
    const keeper = this.players.find((p) => p.team !== team && p.gk);
    this.owner = keeper.team;
    this.carrier = keeper;
    this.ball.x = keeper.x + this.dir(keeper.team) * 0.8;
    this.ball.y = keeper.y;
    this.ball.z = 0;
    this.phase = 'restart';
    this.timer = f.onTarget ? 0.6 : 1.2;
    this.emit(f.onTarget ? 'save' : 'miss', { team });
  }
}
