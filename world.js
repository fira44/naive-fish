const TANK_W = 900;
const TANK_H = 560;
const FLOOR_Y = 504;

const FOOD = 0;
const POISON = 1;
const JUNK = 2;

const CLASS_INFO = [
  { name: 'Food', color: '#3ddc84', hp: 10 },
  { name: 'Poison', color: '#ff4d5e', hp: -20 },
  { name: 'Junk', color: '#9aa7b4', hp: 0 },
];

const FEATURE_NAMES = ['Bright', 'Moving', 'Small', 'Rising'];

// p[j] = probability that feature j is 1 for this object type (hidden from the fish)
const OBJECT_TYPES = [
  { id: 'flake',  label: 'Flake',      cls: FOOD,   p: [0.20, 0.05, 0.95, 0.05], bright: '#ffd23f', dim: '#b59a5b' },
  { id: 'worm',   label: 'Worm',       cls: FOOD,   p: [0.10, 0.95, 0.90, 0.05], bright: '#ff7fa0', dim: '#a8707f' },
  { id: 'algae',  label: 'Algae',      cls: POISON, p: [0.90, 0.10, 0.10, 0.05], bright: '#39ff88', dim: '#4f8f6a' },
  { id: 'pill',   label: 'Red pill',   cls: POISON, p: [0.95, 0.05, 0.90, 0.05], bright: '#ff2d2d', dim: '#9a4a4a' },
  { id: 'bag',    label: 'Plastic',    cls: JUNK,   p: [0.25, 0.60, 0.05, 0.10], bright: '#e8f6ff', dim: '#9fb4c0' },
  { id: 'bubble', label: 'Bubble',     cls: JUNK,   p: [0.70, 0.60, 0.90, 0.95], bright: '#bff3ff', dim: '#8fb8c4' },
];

function spawnObject(typeId) {
  const type = typeId
    ? OBJECT_TYPES.find((t) => t.id === typeId)
    : OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
  const f = type.p.map((p) => (Math.random() < p ? 1 : 0));
  const moving = f[1] === 1;
  const rising = f[3] === 1;
  const r = f[2] ? 8 : 16;
  const side = Math.random() < 0.5 ? -1 : 1;
  const baseX = 60 + Math.random() * (TANK_W - 120);
  return {
    type,
    cls: type.cls,
    f,
    r,
    baseX,
    x: baseX,
    y: rising ? FLOOR_Y - r : -r,
    vy: rising ? -(40 + Math.random() * 20) : 30 + Math.random() * 20 + (f[2] ? 0 : 12),
    drift: side * (moving ? 25 + Math.random() * 20 : Math.random() * 6),
    phase: Math.random() * Math.PI * 2,
    age: 0,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * (moving ? 3 : 1),
    shape: Array.from({ length: 8 }, () => 0.7 + Math.random() * 0.5),
    seen: false,
    decision: null,
    eaten: false,
    settled: false,
    settleT: 0,
    lockT: 0,
  };
}

// returns false when the object should be removed
function updateObject(o, dt) {
  o.age += dt;
  o.baseX += o.drift * dt;
  if (o.baseX < 24 || o.baseX > TANK_W - 24) {
    o.drift = -o.drift;
    o.baseX = Math.min(TANK_W - 24, Math.max(24, o.baseX));
  }
  o.x = o.baseX + (o.f[1] ? Math.sin(o.age * 2.4 + o.phase) * 18 : 0);
  o.rot += o.rotSpeed * dt;

  if (o.f[3]) {
    o.y += o.vy * dt;
    if (o.y < 12) return false;
  } else if (!o.settled) {
    o.y += o.vy * dt;
    const restY = FLOOR_Y - o.r * 0.6;
    if (o.y >= restY) {
      o.y = restY;
      o.settled = true;
    }
  } else {
    o.settleT += dt;
    if (o.settleT > 8) return false;
  }
  return true;
}

function featureWords(f) {
  return [
    f[0] ? 'bright' : 'dull',
    f[1] ? 'moving' : 'still',
    f[2] ? 'small' : 'large',
    f[3] ? 'rising' : 'sinking',
  ].join(' · ');
}
