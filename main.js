(() => {
  const VISION = 300;
  const MAX_OBJECTS = 7;
  const RECENT_WINDOW = 30;
  const APPROACH = new Set(['eat', 'unsure', 'explore']);
  const APPROACH_SPEED = { eat: 150, explore: 115, unsure: 80 };
  const DECISION_TITLE = {
    eat: 'Looks tasty: eat it',
    unsure: 'Unsure: approaching carefully',
    explore: 'Not sure about it: tasting anyway',
    avoid: 'Danger: avoid',
    ignore: 'Junk: ignore',
    locked: 'LOCKED: every P = 0',
  };

  const canvas = document.getElementById('tank');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = TANK_W * dpr;
  canvas.height = TANK_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const el = (id) => document.getElementById(id);
  const hud = {
    hpFill: el('hp-fill'),
    hpText: el('hp-text'),
    eaten: el('eaten'),
    accuracy: el('accuracy'),
    recent: el('recent'),
    fainted: el('fainted'),
  };

  const brain = new NaiveBayes(3, 4);
  const settings = { laplace: true, explore: 0.12, speed: 1 };
  const state = { hp: 100, eaten: 0, fainted: 0, recent: [], objects: [], texts: [], spawnT: 0, time: 0 };
  const fish = {
    x: TANK_W / 2, y: 220, vx: 0, vy: 0, facing: 1, roll: 0, tailPhase: 0,
    mouthT: 0, flashT: 0, flashColor: '#fff', faintT: 0, shaking: false,
    wander: { x: 300, y: 200, t: 0 },
    shown: [1 / 3, 1 / 3, 1 / 3],
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const alpha = () => (settings.laplace ? 1 : 0);
  const mouthPos = () => ({ x: fish.x + Math.sign(fish.facing || 1) * 26, y: fish.y + 2 });
  const addText = (x, y, text, color) => state.texts.push({ x, y, text, color, life: 1.3 });

  function decide(o) {
    const { probs, locked } = brain.predict(o.f, alpha());
    let decision;
    if (locked) {
      decision = 'locked';
    } else {
      const best = probs.indexOf(Math.max(...probs));
      if (best === FOOD) decision = 'eat';
      else if (probs[best] < 0.5) decision = 'unsure';
      else decision = best === POISON ? 'avoid' : 'ignore';
    }
    if (['avoid', 'ignore', 'locked'].includes(decision) && Math.random() < settings.explore) {
      decision = 'explore';
    }
    o.decision = decision;
    const approached = APPROACH.has(decision);
    state.recent.push(approached ? o.cls === FOOD : o.cls !== FOOD);
    if (state.recent.length > RECENT_WINDOW) state.recent.shift();
  }

  function eat(o) {
    o.eaten = true;
    const info = CLASS_INFO[o.cls];
    state.hp = clamp(state.hp + info.hp, 0, 100);
    const label = info.hp > 0 ? FOOD : info.hp < 0 ? POISON : JUNK;
    brain.learn(o.f, label);
    state.eaten += 1;
    fish.mouthT = 0.4;
    fish.flashT = 0.5;
    fish.flashColor = info.color;
    addText(o.x, o.y - 12, info.hp > 0 ? `+${info.hp}` : info.hp < 0 ? `${info.hp}` : 'junk (0)', info.color);
    if (state.hp <= 0) {
      fish.faintT = 2.4;
      state.fainted += 1;
      addText(fish.x, fish.y - 34, 'Fainted!', '#ff4d5e');
    }
  }

  function updateFish(dt) {
    fish.mouthT = Math.max(0, fish.mouthT - dt);
    fish.flashT = Math.max(0, fish.flashT - dt);

    if (fish.faintT > 0) {
      fish.faintT -= dt;
      fish.roll = lerp(fish.roll, Math.PI, Math.min(1, dt * 6));
      fish.vx *= 0.95;
      fish.vy = -18;
      fish.y = Math.max(40, fish.y + fish.vy * dt);
      fish.tailPhase += dt * 2;
      if (fish.faintT <= 0) {
        state.hp = 50;
        addText(fish.x, fish.y - 34, 'Back up! HP 50', '#3ddc84');
      }
      return;
    }
    fish.roll = lerp(fish.roll, 0, Math.min(1, dt * 8));

    for (const o of state.objects) {
      if (!o.seen && !o.eaten && Math.hypot(o.x - fish.x, o.y - fish.y) < VISION) {
        o.seen = true;
        decide(o);
      }
    }

    const mouth = mouthPos();
    let target = null;
    let targetDist = Infinity;
    for (const o of state.objects) {
      if (o.eaten || !APPROACH.has(o.decision)) continue;
      const d = Math.hypot(o.x - mouth.x, o.y - mouth.y);
      if (d < targetDist) {
        targetDist = d;
        target = o;
      }
    }

    let dx = 0;
    let dy = 0;
    let speed = 0;
    fish.shaking = false;

    if (target) {
      dx = target.x - mouth.x;
      dy = target.y - mouth.y;
      speed = APPROACH_SPEED[target.decision];
    } else {
      const frozenBy = state.objects.find(
        (o) => !o.eaten && o.decision === 'locked' && Math.hypot(o.x - fish.x, o.y - fish.y) < 220
      );
      if (frozenBy) {
        frozenBy.lockT += dt;
        fish.shaking = true;
        if (frozenBy.lockT > 1.8) frozenBy.decision = 'ignore';
      } else {
        const w = fish.wander;
        w.t -= dt;
        if (w.t <= 0 || Math.hypot(w.x - fish.x, w.y - fish.y) < 20) {
          w.x = 60 + Math.random() * (TANK_W - 120);
          w.y = 80 + Math.random() * (FLOOR_Y - 190);
          w.t = 3 + Math.random() * 3;
        }
        dx = w.x - fish.x;
        dy = w.y - fish.y;
        speed = 45;
      }
    }

    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    for (const o of state.objects) {
      if (o.eaten || o.decision !== 'avoid') continue;
      const ox = fish.x - o.x;
      const oy = fish.y - o.y;
      const d = Math.hypot(ox, oy);
      if (d < 140 && d > 0) {
        const push = (1 - d / 140) * 2.2;
        dx += (ox / d) * push;
        dy += (oy / d) * push;
        speed = Math.max(speed, 150);
      }
    }
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }

    const k = Math.min(1, dt * 3.5);
    fish.vx += (dx * speed - fish.vx) * k;
    fish.vy += (dy * speed - fish.vy) * k;
    fish.x = clamp(fish.x + fish.vx * dt, 40, TANK_W - 40);
    fish.y = clamp(fish.y + fish.vy * dt, 40, FLOOR_Y - 14);

    if (Math.abs(fish.vx) > 6) fish.facing = lerp(fish.facing, Math.sign(fish.vx), Math.min(1, dt * 8));
    fish.tailPhase += dt * (4 + Math.hypot(fish.vx, fish.vy) * 0.12);

    const m = mouthPos();
    for (const o of state.objects) {
      if (o.eaten || !APPROACH.has(o.decision)) continue;
      if (Math.hypot(o.x - m.x, o.y - m.y) < 18 + o.r * 0.6) {
        eat(o);
        break;
      }
    }
  }

  function focusObject() {
    let best = null;
    let bestDist = VISION;
    for (const o of state.objects) {
      if (o.eaten) continue;
      const d = Math.hypot(o.x - fish.x, o.y - fish.y);
      if (d < bestDist) {
        bestDist = d;
        best = o;
      }
    }
    return best;
  }

  function update(dt) {
    state.time += dt;
    state.spawnT -= dt;
    if (state.spawnT <= 0 && state.objects.filter((o) => !o.eaten).length < MAX_OBJECTS) {
      state.objects.push(spawnObject());
      state.spawnT = 1.4 + Math.random() * 1.4;
    }
    state.objects = state.objects.filter((o) => !o.eaten && updateObject(o, dt));
    updateFish(dt);
    state.objects = state.objects.filter((o) => !o.eaten);
    for (const t of state.texts) {
      t.life -= dt;
      t.y -= 30 * dt;
    }
    state.texts = state.texts.filter((t) => t.life > 0);
  }

  function render() {
    drawBackground(ctx, state.time);
    for (const o of state.objects) drawObject(ctx, o);

    const focus = fish.faintT > 0 ? null : focusObject();
    if (focus) {
      drawFocusRing(ctx, fish, focus, state.time);
      drawFocusTag(ctx, focus);
    }
    drawFish(ctx, fish);

    let title;
    let probs;
    let locked = false;
    if (fish.faintT > 0) {
      title = 'Out cold';
      probs = [0, 0, 0];
    } else if (focus) {
      const res = brain.predict(focus.f, alpha());
      locked = res.locked;
      probs = res.probs;
      title = DECISION_TITLE[focus.decision] || 'Thinking';
      if (locked && focus.decision !== 'locked') title = DECISION_TITLE.locked;
    } else {
      probs = brain.priors(alpha());
      title = 'Prior belief (nothing in sight)';
    }
    for (let c = 0; c < 3; c++) fish.shown[c] = lerp(fish.shown[c], probs[c], 0.25);
    drawBrainPanel(ctx, fish, title, fish.shown, locked);
    drawFloatingTexts(ctx, state.texts);
  }

  function updateHud() {
    hud.hpFill.style.width = `${state.hp}%`;
    hud.hpFill.style.background = state.hp > 50 ? '#3ddc84' : state.hp > 25 ? '#ffb347' : '#ff4d5e';
    hud.hpText.textContent = Math.round(state.hp);
    hud.eaten.textContent = state.eaten;
    hud.fainted.textContent = state.fainted;
    const goodEats = brain.classTotals[FOOD];
    const pct = brain.total ? Math.round((goodEats / brain.total) * 100) : 0;
    hud.accuracy.textContent = `${goodEats} / ${brain.total}  (${pct}%)`;
    const n = state.recent.length;
    hud.recent.textContent = n ? `${Math.round((state.recent.filter(Boolean).length / n) * 100)}%` : '-';
  }

  const tableBody = el('brain-body');
  const formulaLine = el('formula-line');
  CLASS_INFO.forEach((info) => {
    const row = document.createElement('tr');
    row.innerHTML =
      `<th style="color:${info.color}">${info.name}</th><td class="n"></td><td class="n"></td>` +
      FEATURE_NAMES.map(() => '<td class="cell"><span class="bar"><i></i></span><b></b></td>').join('');
    tableBody.appendChild(row);
  });

  function updateTable() {
    const a = alpha();
    formulaLine.textContent =
      `P(feature = yes | class) = (count + ${a}) / (class count + ${2 * a})    ` +
      (a ? 'Laplace ON: unseen = small but never zero' : 'Laplace OFF: unseen = exactly 0');
    [...tableBody.rows].forEach((row, c) => {
      const cells = row.querySelectorAll('td');
      cells[0].textContent = brain.classTotals[c];
      cells[1].textContent = `${Math.round(brain.prior(c, a) * 100)}%`;
      for (let j = 0; j < 4; j++) {
        const cell = cells[2 + j];
        const noData = brain.classTotals[c] + 2 * a === 0;
        const p = noData ? 0 : brain.likelihood(c, j, 1, a);
        cell.querySelector('i').style.width = `${p * 100}%`;
        cell.querySelector('i').style.background = CLASS_INFO[c].color;
        cell.querySelector('b').textContent = noData ? '-' : `${Math.round(p * 100)}%`;
      }
    });
  }

  el('laplace').addEventListener('change', (e) => {
    settings.laplace = e.target.checked;
    el('laplace-label').textContent = settings.laplace ? 'ON (alpha = 1)' : 'OFF (alpha = 0)';
  });
  el('explore').addEventListener('input', (e) => {
    settings.explore = e.target.value / 100;
    el('explore-val').textContent = `${e.target.value}%`;
  });
  el('speed').addEventListener('input', (e) => {
    settings.speed = parseFloat(e.target.value);
    el('speed-val').textContent = `${settings.speed.toFixed(1)}x`;
  });
  el('reset').addEventListener('click', () => {
    brain.reset();
    Object.assign(state, { hp: 100, eaten: 0, fainted: 0, recent: [], objects: [], texts: [], spawnT: 0 });
    Object.assign(fish, { faintT: 0, roll: 0, vx: 0, vy: 0 });
  });

  const dropBar = el('drop-bar');
  OBJECT_TYPES.forEach((type) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = type.label;
    button.addEventListener('click', () => state.objects.push(spawnObject(type.id)));
    dropBar.appendChild(button);
  });

  state.objects.push(spawnObject(), spawnObject());
  state.objects[1].baseX = (state.objects[0].baseX + 300) % (TANK_W - 120) + 60;

  let last = performance.now();
  let tableTimer = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * settings.speed;
    last = now;
    update(dt);
    render();
    updateHud();
    tableTimer -= dt;
    if (tableTimer <= 0) {
      updateTable();
      tableTimer = 0.25;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
