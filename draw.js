const PEBBLES = Array.from({ length: 46 }, () => ({
  x: Math.random() * TANK_W,
  y: FLOOR_Y + 8 + Math.random() * (TANK_H - FLOOR_Y - 14),
  r: 2 + Math.random() * 4,
  shade: Math.random(),
}));

const PLANTS = [
  { x: 48, h: 130, color: '#1f9d55', phase: 0.3 },
  { x: 84, h: 92, color: '#2fbf71', phase: 1.4 },
  { x: 312, h: 110, color: '#27a862', phase: 2.2 },
  { x: 628, h: 136, color: '#1f9d55', phase: 3.1 },
  { x: 826, h: 100, color: '#2fbf71', phase: 4.0 },
  { x: 862, h: 146, color: '#1c8a4c', phase: 5.2 },
];

const AMBIENT_BUBBLES = Array.from({ length: 16 }, () => ({
  x: Math.random() * TANK_W,
  r: 1.5 + Math.random() * 3,
  speed: 12 + Math.random() * 22,
  offset: Math.random() * 600,
  phase: Math.random() * 6,
}));

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, t) {
  const water = ctx.createLinearGradient(0, 0, 0, TANK_H);
  water.addColorStop(0, '#7fdcf5');
  water.addColorStop(0.45, '#2a9bd0');
  water.addColorStop(1, '#0a3d66');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, TANK_W, TANK_H);

  for (let i = 0; i < 6; i++) {
    const x0 = 40 + i * 160 + Math.sin(t * 0.3 + i) * 30;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + 60, 0);
    ctx.lineTo(x0 + 190 + Math.sin(t * 0.4 + i) * 20, FLOOR_Y);
    ctx.lineTo(x0 + 70, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= TANK_W; x += 10) {
    const y = 5 + Math.sin(x * 0.03 + t * 1.6) * 2;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const b of AMBIENT_BUBBLES) {
    const y = TANK_H - ((t * b.speed + b.offset) % (TANK_H + 20));
    const x = b.x + Math.sin(t + b.phase) * 6;
    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of PLANTS) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, FLOOR_Y + 4);
    const steps = 9;
    for (let k = 1; k <= steps; k++) {
      const y = FLOOR_Y - (k * p.h) / steps;
      const x = p.x + Math.sin(t * 1.2 + p.phase + k * 0.5) * k * 2.2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const sand = ctx.createLinearGradient(0, FLOOR_Y, 0, TANK_H);
  sand.addColorStop(0, '#e6cf98');
  sand.addColorStop(1, '#b89b5f');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y + 6);
  for (let x = 0; x <= TANK_W; x += 30) ctx.lineTo(x, FLOOR_Y + 4 + Math.sin(x * 0.05) * 4);
  ctx.lineTo(TANK_W, TANK_H);
  ctx.lineTo(0, TANK_H);
  ctx.closePath();
  ctx.fill();

  for (const p of PEBBLES) {
    ctx.fillStyle = `hsl(35, 25%, ${45 + p.shade * 30}%)`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * 1.3, p.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObject(ctx, o) {
  const bright = o.f[0] === 1;
  const color = bright ? o.type.bright : o.type.dim;
  const r = o.r;
  ctx.save();
  ctx.translate(o.x, o.y);
  if (bright) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (o.type.id) {
    case 'flake': {
      ctx.rotate(o.rot);
      ctx.beginPath();
      o.shape.slice(0, 7).forEach((m, i) => {
        const a = (i / 7) * Math.PI * 2;
        const x = Math.cos(a) * r * m;
        const y = Math.sin(a) * r * m;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, 0);
      ctx.lineTo(r * 0.4, -r * 0.2);
      ctx.stroke();
      break;
    }
    case 'worm': {
      const speed = o.f[1] ? 9 : 2;
      for (let i = 0; i < 8; i++) {
        const px = (i - 3.5) * r * 0.5;
        const py = Math.sin(o.age * speed + i * 0.8) * r * 0.32;
        ctx.beginPath();
        ctx.arc(px, py, r * (i === 7 ? 0.42 : 0.34), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a1018';
      ctx.beginPath();
      ctx.arc(3.5 * r * 0.5 + r * 0.12, Math.sin(o.age * speed + 7 * 0.8) * r * 0.32 - r * 0.1, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'algae': {
      ctx.lineWidth = Math.max(2.5, r * 0.22);
      ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k - 2) * 0.55;
        const sway = Math.sin(o.age * 2 + k) * r * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.3);
        ctx.quadraticCurveTo(Math.cos(a) * r * 0.7 + sway, Math.sin(a) * r * 0.7, Math.cos(a) * r * 1.3 + sway, Math.sin(a) * r * 1.3);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, r * 0.3, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pill': {
      ctx.rotate(o.rot);
      ctx.save();
      roundedRect(ctx, -r, -r * 0.5, r * 2, r, r * 0.5);
      ctx.clip();
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(-r, -r * 0.5, r * 2, r);
      ctx.fillStyle = color;
      ctx.fillRect(-r, -r * 0.5, r, r);
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.2;
      roundedRect(ctx, -r, -r * 0.5, r * 2, r, r * 0.5);
      ctx.stroke();
      break;
    }
    case 'bag': {
      ctx.rotate(Math.sin(o.age * 1.3 + o.phase) * 0.25);
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      o.shape.forEach((m, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * r * 1.15 * m;
        const y = Math.sin(a) * r * 0.9 * m;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.85, r * 0.3, Math.PI, 0);
      ctx.arc(r * 0.35, -r * 0.85, r * 0.3, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case 'bubble': {
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawFish(ctx, fish) {
  const tilt = Math.atan2(fish.vy, Math.abs(fish.vx) + 40) * 0.6;
  const wag = Math.sin(fish.tailPhase);
  const shake = fish.shaking ? Math.sin(fish.tailPhase * 3) * 0.12 : 0;
  ctx.save();
  ctx.translate(fish.x, fish.y);
  ctx.scale(fish.facing, 1);
  ctx.rotate(tilt + fish.roll + shake);

  if (fish.flashT > 0) {
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 56);
    glow.addColorStop(0, fish.flashColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = Math.min(1, fish.flashT * 2) * 0.7;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(-22, 0);
  ctx.rotate(wag * 0.32);
  const tail = ctx.createLinearGradient(-36, 0, 0, 0);
  tail.addColorStop(0, '#ff6a2a');
  tail.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-12, -14, -30, -20, -36, -17);
  ctx.bezierCurveTo(-27, -5, -27, 5, -36, 17);
  ctx.bezierCurveTo(-30, 20, -12, 14, 0, 0);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ff7a2f';
  ctx.beginPath();
  ctx.moveTo(-10, -14);
  ctx.quadraticCurveTo(-2 + wag * 2, -34, 14, -13);
  ctx.closePath();
  ctx.fill();

  const body = ctx.createLinearGradient(0, -18, 0, 18);
  body.addColorStop(0, '#ffb347');
  body.addColorStop(0.55, '#ff8a3a');
  body.addColorStop(1, '#ffe0b0');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 29, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, 29, 17, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(7, -20, 5, 40);
  ctx.fillRect(-11, -20, 4, 40);
  ctx.restore();

  ctx.save();
  ctx.translate(-2, 6);
  ctx.rotate(Math.sin(fish.tailPhase * 1.3) * 0.45 + 0.4);
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.ellipse(-5, 0, 10, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(160,60,10,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(11, 0, 11, -0.9, 0.9);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(17, -4, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12202e';
  ctx.beginPath();
  ctx.arc(18.2, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(19, -5, 0.9, 0, Math.PI * 2);
  ctx.fill();

  if (fish.mouthT > 0) {
    const opening = Math.sin(Math.min(1, fish.mouthT / 0.4) * Math.PI);
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.moveTo(24, 3);
    ctx.lineTo(34, 3 - opening * 8);
    ctx.lineTo(34, 3 + opening * 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = '#8a3510';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(26, 3);
    ctx.lineTo(30, 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFocusTag(ctx, o) {
  const text = featureWords(o.f);
  ctx.save();
  ctx.font = '600 11px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  const x = Math.min(TANK_W - w - 4, Math.max(4, o.x - w / 2));
  const y = Math.min(FLOOR_Y + 40, o.y + o.r + 10);
  ctx.fillStyle = 'rgba(8,24,44,0.78)';
  roundedRect(ctx, x, y, w, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#e8f4ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 6, y + 9.5);
  ctx.restore();
}

function drawFocusRing(ctx, fish, o, t) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(o.x, o.y, o.r + 8 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([2, 6]);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(fish.x, fish.y);
  ctx.lineTo(o.x, o.y);
  ctx.stroke();
  ctx.restore();
}

function drawBrainPanel(ctx, fish, title, probs, locked) {
  const w = 184;
  const h = 84;
  const x = Math.min(TANK_W - w - 6, Math.max(6, fish.x - w / 2));
  let y = fish.y - h - 36;
  if (y < 8) y = fish.y + 40;

  ctx.save();
  ctx.fillStyle = 'rgba(8,24,44,0.86)';
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = locked ? '#ff4d5e' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = locked ? 2 : 1;
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.font = '700 11.5px system-ui, sans-serif';
  ctx.fillStyle = locked ? '#ff8591' : '#ffffff';
  ctx.fillText(title, x + 10, y + 14);

  ctx.font = '600 11px system-ui, sans-serif';
  const barX = x + 54;
  const barW = 90;
  for (let c = 0; c < 3; c++) {
    const by = y + 33 + c * 16;
    ctx.fillStyle = '#b9cbe0';
    ctx.fillText(CLASS_INFO[c].name, x + 10, by);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundedRect(ctx, barX, by - 5, barW, 10, 5);
    ctx.fill();
    const fill = Math.max(0, Math.min(1, probs[c])) * barW;
    if (fill > 1) {
      ctx.fillStyle = CLASS_INFO[c].color;
      roundedRect(ctx, barX, by - 5, Math.max(fill, 6), 10, 5);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(probs[c] * 100)}%`, barX + barW + 8, by);
  }
  ctx.restore();
}

function drawFloatingTexts(ctx, texts) {
  ctx.save();
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = Math.max(0, t.life / 1.3);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8,24,44,0.8)';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}
