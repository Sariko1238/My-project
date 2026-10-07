/**
 * ============================================================================
 * ХРОНИКИ КРИПЕРА (Minecraft Dungeon Roguelike RPG) — Web Canvas Edition
 * Полноценная 2D-графическая игра:
 * - Персонаж: Каноничный пиксельный Крипер с анимациями, ходьбой и режимом Заряженного Крипера
 * - Система этапов: 5 биомов Майнкрафта (Верхний мир, Шахта, Скалк, Незер, Край)
 * - Уровни 1-3 в каждом этапе с уникальными боссами и выбором Даров Крипера
 * - Звуковой синтезатор Web Audio API (Тссс..., БУМ, молнии, фанфары)
 * ============================================================================
 */

// ==========================================
// ЗВУКОВОЙ ДВИЖОК (WEB AUDIO API SYNTHESIZER)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playStep() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch(e) {}
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch(e) {}
  }

  playHiss() {
    if (!this.enabled || !this.ctx) return;
    try {
      // Аутентичный звук шипения фитиля Крипера: "Тсссссссс..."
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.min(1, (i / bufferSize) * 1.6);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(4600, this.ctx.currentTime + 0.42);
      filter.Q.value = 3.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.24, this.ctx.currentTime + 0.38);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch(e) {}
  }

  playExplosion() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Низкочастотный ударный импульс
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.38);
      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.linearRampToValueAtTime(0.01, now + 0.38);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);

      // Грохот взрывной волны (фильтрованный шум)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, now);
      noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch(e) {}
  }

  playChargedLightning() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [580, 290, 145].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(40, now + idx * 0.04 + 0.22);
        gain.gain.setValueAtTime(0.22, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.22);
      });
    } catch(e) {}
  }

  playLoot() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 660, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.01, now + (idx + 1) * 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + (idx + 1) * 0.06);
      });
    } catch(e) {}
  }

  playLevelUp() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [330, 440, 550, 660, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + (idx + 1) * 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + (idx + 1) * 0.08);
      });
    } catch(e) {}
  }

  playVictory() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554, 659, 880, 1108].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch(e) {}
  }
}

const sfx = new SoundFX();

// ==========================================
// ТИПЫ И КОНСТАНТЫ
// ==========================================
const TILE_SIZE = 36;
const MAP_WIDTH = 34;
const MAP_HEIGHT = 22;

const Tile = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR_CLOSED: 3,
  DOOR_OPEN: 4,
  STAIRS: 5,
  TRAP: 6,
  CHEST: 7,
  SHRINE: 8
};

const Rarity = {
  COMMON: { name: "Обычный", color: "#cbd5e1" },
  RARE: { name: "Редкий", color: "#3b82f6" },
  EPIC: { name: "Эпический", color: "#a855f7" },
  LEGENDARY: { name: "Легендарный", color: "#f59e0b" }
};

// ==========================================
// БАЗА ЭТАПОВ И БИОМОВ (5 ЭТАПОВ МАЙНКРАФТА)
// ==========================================
const STAGES = [
  {
    id: 1,
    name: "Этап 1: Верхний мир",
    subName: "Тёмный лес и Пещеры",
    theme: {
      floorVisible: "#1a261c",
      floorExplored: "#101811",
      wallVisible: "#283829",
      wallExplored: "#152016",
      wallTop: "#3e563f",
      accent: "#22c55e",
      particleColor: "#4ade80",
      particleType: "spore"
    },
    monsters: [
      { type: "zombie", name: "Зомби-рубака", icon: "🧟", hp: 28, atk: 9, xp: 20 },
      { type: "skeleton", name: "Скелет-лучник", icon: "🏹", hp: 20, atk: 11, xp: 25 },
      { type: "spider", name: "Лесной паук", icon: "🕷️", hp: 32, atk: 13, xp: 30 }
    ],
    boss: {
      type: "boss",
      name: "Король Пауков",
      icon: "🕷️",
      title: "Древний Вожак Леса",
      hp: 135,
      atk: 22,
      xp: 160
    }
  },
  {
    id: 2,
    name: "Этап 2: Заброшенная шахта",
    subName: "Подземные крепи и рудники",
    theme: {
      floorVisible: "#261d15",
      floorExplored: "#160f0b",
      wallVisible: "#3b2b1c",
      wallExplored: "#21160d",
      wallTop: "#563e26",
      accent: "#f59e0b",
      particleColor: "#fbbf24",
      particleType: "dust"
    },
    monsters: [
      { type: "cave_spider", name: "Пещерный паук", icon: "🕷️", hp: 44, atk: 15, xp: 38 },
      { type: "armored_skel", name: "Скелет в шлеме", icon: "💀", hp: 50, atk: 18, xp: 46 },
      { type: "pillager", name: "Разбойник с топором", icon: "🪓", hp: 60, atk: 22, xp: 55 }
    ],
    boss: {
      type: "boss",
      name: "Каменный Голем Шахты",
      icon: "🗿",
      title: "Древний Страж Подземелья",
      hp: 230,
      atk: 30,
      xp: 280
    }
  },
  {
    id: 3,
    name: "Этап 3: Глубокая тьма",
    subName: "Скалк-Пещеры",
    theme: {
      floorVisible: "#061d24",
      floorExplored: "#030e12",
      wallVisible: "#0c2b36",
      wallExplored: "#06181f",
      wallTop: "#14485b",
      accent: "#06b6d4",
      particleColor: "#22d3ee",
      particleType: "sculk"
    },
    monsters: [
      { type: "sculk_zombie", name: "Скалк-зомби", icon: "🧟‍♂️", hp: 68, atk: 24, xp: 65 },
      { type: "shrieker", name: "Теневой крикун", icon: "👻", hp: 58, atk: 28, xp: 75 },
      { type: "sculk_guardian", name: "Скалк-страж", icon: "👾", hp: 84, atk: 32, xp: 90 }
    ],
    boss: {
      type: "boss",
      name: "Хранитель Глубин (Варден)",
      icon: "👹",
      title: "Слепой Ужас Скалка",
      hp: 380,
      atk: 42,
      xp: 450
    }
  },
  {
    id: 4,
    name: "Этап 4: Незер",
    subName: "Адская крепость",
    theme: {
      floorVisible: "#2d0a0f",
      floorExplored: "#180407",
      wallVisible: "#450e16",
      wallExplored: "#26060c",
      wallTop: "#6b1724",
      accent: "#ef4444",
      particleColor: "#f87171",
      particleType: "ember"
    },
    monsters: [
      { type: "wither_skel", name: "Визер-скелет", icon: "🗡️", hp: 98, atk: 36, xp: 100 },
      { type: "piglin", name: "Пиглин-варвар", icon: "🐷", hp: 115, atk: 38, xp: 115 },
      { type: "blaze", name: "Огненный Ифрит", icon: "🔥", hp: 90, atk: 44, xp: 130 }
    ],
    boss: {
      type: "boss",
      name: "Владыка Ифритов",
      icon: "🔥",
      title: "Пламенный Титан Нижнего Мира",
      hp: 540,
      atk: 54,
      xp: 650
    }
  },
  {
    id: 5,
    name: "Этап 5: Край",
    subName: "Цитадель Энда",
    theme: {
      floorVisible: "#201a2e",
      floorExplored: "#100c17",
      wallVisible: "#322649",
      wallExplored: "#1c1429",
      wallTop: "#4d3a70",
      accent: "#a855f7",
      particleColor: "#c084fc",
      particleType: "ender"
    },
    monsters: [
      { type: "enderman", name: "Эндермен", icon: "👁️", hp: 135, atk: 48, xp: 160 },
      { type: "shulker", name: "Шалкер Края", icon: "📦", hp: 145, atk: 46, xp: 170 },
      { type: "phantom", name: "Фантом Пустоты", icon: "🦇", hp: 115, atk: 52, xp: 185 }
    ],
    boss: {
      type: "boss",
      name: "Дракон Края",
      icon: "🐉",
      title: "Владыка Измерения Энда (ФИНАЛ)",
      hp: 800,
      atk: 65,
      xp: 1800
    }
  }
];

// ==========================================
// ПЕРКИ КРИПЕРА (ВЫБОР ПОСЛЕ ЭТАПА)
// ==========================================
const PERKS = [
  {
    id: "super_blast",
    icon: "💥",
    name: "Сверх-детонация",
    desc: "+35% к урону от умения «Детонация» и радиус взрыва +1 клетка во все стороны!",
    tag: "Урон",
    apply: (p) => { p.bonusExplosionDmg += 0.35; p.bonusExplosionRadius += 1; }
  },
  {
    id: "charged_core",
    icon: "⚡",
    name: "Конденсатор молний",
    desc: "+40 щита, и Крипер начинает каждый новый уровень Заряженным!",
    tag: "Защита",
    apply: (p) => { p.shield += 40; p.isCharged = true; }
  },
  {
    id: "mob_vitality",
    icon: "💚",
    name: "Регенерация моба",
    desc: "+50 к макс. HP и пассивное восстановление +4 HP каждый сделанный ход!",
    tag: "Выживание",
    apply: (p) => { p.maxHp += 50; p.hp += 50; p.regenHpPerTurn += 4; }
  },
  {
    id: "diamond_scales",
    icon: "💎",
    name: "Алмазная чешуя",
    desc: "+8 к постоянной броне и -15% получаемого урона от любых ударов!",
    tag: "Броня",
    apply: (p) => { p.baseDef += 8; }
  },
  {
    id: "silent_stalker",
    icon: "👣",
    name: "Бесшумный охотник",
    desc: "+15% к шансу уворота и +20% к шансу нанесения критического урона!",
    tag: "Ловкость",
    apply: (p) => { p.baseDodge += 0.15; p.baseCrit += 0.20; }
  },
  {
    id: "totem_immortal",
    icon: "🗿",
    name: "Тотем бессмертия",
    desc: "При смертельном ударе Крипер воскресает с 60% HP и отбрасывает всех врагов!",
    tag: "Легенда",
    apply: (p) => { p.hasTotem = true; }
  },
  {
    id: "nether_powder",
    icon: "🔥",
    name: "Адский порох",
    desc: "+12 к базовой атаке Крипера и +15 макс. MP!",
    tag: "Урон",
    apply: (p) => { p.baseAtk += 12; p.maxMp += 15; p.mp += 15; }
  }
];

// ==========================================
// БАЗА ПРЕДМЕТОВ (MINECRAFT EDITION)
// ==========================================
const ITEM_DB = [
  { name: "Деревянный меч", type: "weapon", rarity: Rarity.COMMON, atk: 4, icon: "🗡️" },
  { name: "Каменный топор", type: "weapon", rarity: Rarity.COMMON, atk: 7, icon: "🪓" },
  { name: "Железный меч", type: "weapon", rarity: Rarity.RARE, atk: 12, crit: 0.1, icon: "⚔️" },
  { name: "Алмазный меч", type: "weapon", rarity: Rarity.EPIC, atk: 22, crit: 0.18, icon: "💎" },
  { name: "Незеритовый клинок", type: "weapon", rarity: Rarity.LEGENDARY, atk: 35, crit: 0.28, icon: "🔥" },
  { name: "Зачарованный трезубец", type: "weapon", rarity: Rarity.LEGENDARY, atk: 42, crit: 0.35, icon: "🔱" },

  { name: "Кожаная куртка", type: "armor", rarity: Rarity.COMMON, def: 3, hp: 15, icon: "🥋" },
  { name: "Железный нагрудник", type: "armor", rarity: Rarity.RARE, def: 8, hp: 35, icon: "🛡️" },
  { name: "Алмазная броня", type: "armor", rarity: Rarity.EPIC, def: 16, hp: 75, icon: "💎" },
  { name: "Незеритовые латы", type: "armor", rarity: Rarity.LEGENDARY, def: 26, hp: 130, icon: "👑" },

  { name: "Око Края", type: "accessory", rarity: Rarity.RARE, hp: 30, mp: 20, icon: "👁️" },
  { name: "Звезда Незера", type: "accessory", rarity: Rarity.EPIC, atk: 8, mp: 45, icon: "⭐" },
  { name: "Тотем бессмертия", type: "accessory", rarity: Rarity.LEGENDARY, hp: 80, def: 6, icon: "🗿" },

  { name: "Кожаные ботинки", type: "boots", rarity: Rarity.COMMON, def: 1, dodge: 0.05, icon: "👢" },
  { name: "Железные сапоги", type: "boots", rarity: Rarity.RARE, def: 4, dodge: 0.10, icon: "🥾" },
  { name: "Алмазные ботинки", type: "boots", rarity: Rarity.EPIC, def: 7, dodge: 0.15, icon: "💎" },
  { name: "Элитры", type: "boots", rarity: Rarity.LEGENDARY, def: 4, dodge: 0.28, icon: "🪽" },

  { name: "Зелье исцеления", type: "potion", rarity: Rarity.COMMON, heal: 45, icon: "🧪" },
  { name: "Зелье регенерации", type: "potion", rarity: Rarity.RARE, heal: 85, mana: 25, icon: "🧪" },
  { name: "Зелье стремительности", type: "potion", rarity: Rarity.COMMON, mana: 40, icon: "🧪" },
  { name: "Золотое яблоко", type: "potion", rarity: Rarity.EPIC, heal: 100, mana: 60, icon: "🍎" },
  { name: "Зачарованное яблоко Нотча", type: "potion", rarity: Rarity.LEGENDARY, heal: 200, mana: 100, icon: "🍏" }
];

// ==========================================
// ОТРИСОВКА КРИПЕРА (MINECRAFT PIXEL ART)
// ==========================================
function drawCreeper(ctx, px, py, tileSize, options = {}) {
  const {
    t = 0,
    isCharged = false,
    isPrimed = false,
    primeProgress = 0,
    shield = 0
  } = options;

  ctx.save();

  const cx = px + tileSize / 2;
  const cy = py + tileSize / 2;

  // Плавное покачивание (ходьба/дыхание)
  const bob = Math.sin(t * 6) * 1.5;
  const walkPhase = Math.sin(t * 10);

  // Надувание перед взрывом (Minecraft priming swell)
  const scale = isPrimed ? (1 + primeProgress * 0.22) : 1;

  ctx.translate(cx, cy + bob);
  ctx.scale(scale, scale);

  // Свечение ауры
  if (isCharged || shield > 0) {
    // Аура Заряженного Крипера
    const auraGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 26);
    auraGrad.addColorStop(0, "rgba(0, 245, 255, 0.5)");
    auraGrad.addColorStop(0.7, "rgba(0, 190, 255, 0.25)");
    auraGrad.addColorStop(1, "rgba(0, 245, 255, 0)");
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    // Электрические дуги молний вокруг тела
    ctx.strokeStyle = "#80f5ff";
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const angle = (t * 4 + (i * Math.PI * 2) / 3);
      const r1 = 14 + Math.sin(t * 8 + i) * 3;
      const r2 = 23 + Math.cos(t * 9 + i) * 3;
      const x1 = Math.cos(angle) * r1;
      const y1 = Math.sin(angle) * r1;
      const x2 = Math.cos(angle + 0.3) * r2;
      const y2 = Math.sin(angle + 0.3) * r2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const midX = (x1 + x2) / 2 + (Math.sin(t * 20 + i) * 5);
      const midY = (y1 + y2) / 2 + (Math.cos(t * 20 + i) * 5);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  } else {
    // Базовое мягкое свечение
    const greenGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
    greenGlow.addColorStop(0, "rgba(34, 197, 94, 0.3)");
    greenGlow.addColorStop(1, "rgba(34, 197, 94, 0)");
    ctx.fillStyle = greenGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Тень под ногами
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 15 - bob, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ------------------------------------------
  // 1. НОГИ КРИПЕРА (4 квадратные лапы)
  // ------------------------------------------
  const legW = 5;
  const legH = 7;
  const legY = 7;
  const legSwing = walkPhase * 2;

  // Задние лапы (чуть темнее)
  ctx.fillStyle = "#1e4d16";
  ctx.fillRect(-8, legY - legSwing, legW, legH);
  ctx.fillRect(3, legY + legSwing, legW, legH);

  // Передние лапы
  ctx.fillStyle = "#2c6e1e";
  ctx.fillRect(-6, legY + legSwing, legW, legH);
  ctx.fillRect(1, legY - legSwing, legW, legH);

  // Подошвы
  ctx.fillStyle = "#163a10";
  ctx.fillRect(-6, legY + legSwing + legH - 2, legW, 2);
  ctx.fillRect(1, legY - legSwing + legH - 2, legW, 2);

  // ------------------------------------------
  // 2. ТУЛОВИЩЕ КРИПЕРА
  // ------------------------------------------
  const bodyW = 12;
  const bodyH = 13;
  const bodyX = -bodyW / 2;
  const bodyY = -5;

  ctx.fillStyle = "#3e9233";
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

  // Текстура пикселей на туловище
  ctx.fillStyle = "#52b043";
  ctx.fillRect(bodyX + 2, bodyY + 2, 3, 3);
  ctx.fillRect(bodyX + 7, bodyY + 6, 3, 3);
  ctx.fillStyle = "#2b7223";
  ctx.fillRect(bodyX + 1, bodyY + 7, 3, 4);
  ctx.fillRect(bodyX + 6, bodyY + 1, 4, 3);

  // ------------------------------------------
  // 3. ГОЛОВА КРИПЕРА (Каноничное 8x8 лицо)
  // ------------------------------------------
  const headSize = 16;
  const headX = -headSize / 2;
  const headY = bodyY - headSize + 2;

  const P = {
    G0: "#52b043", // базовый зеленый
    G1: "#3e9233", // средний зеленый
    G2: "#2c7223", // темно-зеленый
    G3: "#69c958", // светло-зеленый
    BK: (isCharged || shield > 0) ? "#022026" : "#0d170d",
    DH: (isCharged || shield > 0) ? "#05303a" : "#182918"
  };

  const grid = [
    [P.G0, P.G1, P.G3, P.G0, P.G2, P.G0, P.G3, P.G1],
    [P.G1, P.G0, P.G2, P.G1, P.G0, P.G3, P.G1, P.G2],
    [P.G0, P.BK, P.BK, P.G1, P.G0, P.BK, P.BK, P.G3],
    [P.G2, P.BK, P.BK, P.G0, P.G2, P.BK, P.BK, P.G0],
    [P.G1, P.G0, P.G0, P.BK, P.BK, P.G1, P.G0, P.G2],
    [P.G3, P.BK, P.BK, P.BK, P.BK, P.BK, P.BK, P.G0],
    [P.G0, P.BK, P.DH, P.BK, P.BK, P.DH, P.BK, P.G1],
    [P.G2, P.BK, P.G1, P.G0, P.G2, P.G1, P.BK, P.G3]
  ];

  const pxSize = headSize / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = grid[r][c];
      ctx.fillRect(headX + c * pxSize, headY + r * pxSize, pxSize, pxSize);
    }
  }

  // Светящиеся глаза в Заряженном состоянии
  if (isCharged || shield > 0) {
    ctx.fillStyle = "#50f5ff";
    ctx.fillRect(headX + 1 * pxSize + 0.5, headY + 2 * pxSize + 0.5, pxSize, pxSize);
    ctx.fillRect(headX + 5 * pxSize + 0.5, headY + 2 * pxSize + 0.5, pxSize, pxSize);
  }

  // Обводка куба головы (3D грани)
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(headX, headY + headSize - 1, headSize, 1);
  ctx.fillRect(headX + headSize - 1, headY, 1, headSize);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(headX, headY, headSize, 1);

  // Белая вспышка перед детонацией (Priming flash)
  if (isPrimed) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, 0.4 + primeProgress * 0.5)})`;
    ctx.fillRect(headX - 1, headY - 1, headSize + 2, headSize + bodyH + legH + 2);
  }

  ctx.restore();
}

// Отрисовка аватара Крипера в UI
function renderHeroAvatar(canvas, isCharged = false) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cellSize = 6.2;
  const startX = (w - 8 * cellSize) / 2;
  const startY = (h - 8 * cellSize) / 2;

  const P = {
    G0: "#52b043",
    G1: "#3e9233",
    G2: "#2c7223",
    G3: "#69c958",
    BK: isCharged ? "#022026" : "#0d170d",
    DH: isCharged ? "#05303a" : "#182918"
  };

  const grid = [
    [P.G0, P.G1, P.G3, P.G0, P.G2, P.G0, P.G3, P.G1],
    [P.G1, P.G0, P.G2, P.G1, P.G0, P.G3, P.G1, P.G2],
    [P.G0, P.BK, P.BK, P.G1, P.G0, P.BK, P.BK, P.G3],
    [P.G2, P.BK, P.BK, P.G0, P.G2, P.BK, P.BK, P.G0],
    [P.G1, P.G0, P.G0, P.BK, P.BK, P.G1, P.G0, P.G2],
    [P.G3, P.BK, P.BK, P.BK, P.BK, P.BK, P.BK, P.G0],
    [P.G0, P.BK, P.DH, P.BK, P.BK, P.DH, P.BK, P.G1],
    [P.G2, P.BK, P.G1, P.G0, P.G2, P.G1, P.BK, P.G3]
  ];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = grid[r][c];
      ctx.fillRect(startX + c * cellSize, startY + r * cellSize, cellSize, cellSize);
    }
  }

  if (isCharged) {
    ctx.fillStyle = "#50f5ff";
    ctx.fillRect(startX + 1 * cellSize + 1, startY + 2 * cellSize + 1, cellSize * 1.5, cellSize * 1.5);
    ctx.fillRect(startX + 5 * cellSize + 1, startY + 2 * cellSize + 1, cellSize * 1.5, cellSize * 1.5);
  }
}

// ==========================================
// КЛАСС ГЕРОЯ (КРИПЕР)
// ==========================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.name = "Крипер";
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 50;
    this.score = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.mp = 50;
    this.maxMp = 50;
    this.shield = 0;

    this.baseAtk = 12;
    this.baseDef = 4;
    this.baseCrit = 0.10;
    this.baseDodge = 0.06;

    // Перки и бонусы Крипера
    this.isCharged = false;
    this.bonusExplosionDmg = 0;
    this.bonusExplosionRadius = 0;
    this.regenHpPerTurn = 0;
    this.hasTotem = false;
    this.perks = new Set();

    this.equipped = {
      weapon: { name: "Деревянный меч", type: "weapon", rarity: Rarity.COMMON, atk: 4, icon: "🗡️" },
      armor: { name: "Кожаная куртка", type: "armor", rarity: Rarity.COMMON, def: 2, hp: 15, icon: "🥋" },
      accessory: null,
      boots: null
    };

    this.inventory = [
      { name: "Зелье исцеления", type: "potion", rarity: Rarity.COMMON, heal: 45, icon: "🧪" },
      { name: "Зелье стремительности", type: "potion", rarity: Rarity.COMMON, mana: 40, icon: "🧪" }
    ];

    this.skillsCd = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.isAlive = true;
  }

  get totalAtk() {
    let bonus = this.equipped.weapon ? (this.equipped.weapon.atk || 0) : 0;
    if (this.equipped.accessory?.atk) bonus += this.equipped.accessory.atk;
    if (this.isCharged) bonus += 6; // Заряженный крипер бьет больнее
    return this.baseAtk + bonus;
  }

  get totalDef() {
    let bonus = this.equipped.armor ? (this.equipped.armor.def || 0) : 0;
    if (this.equipped.boots?.def) bonus += this.equipped.boots.def;
    if (this.equipped.accessory?.def) bonus += this.equipped.accessory.def;
    return this.baseDef + bonus;
  }

  get totalCrit() {
    let c = this.baseCrit;
    if (this.equipped.weapon?.crit) c += this.equipped.weapon.crit;
    return c;
  }

  get totalDodge() {
    let d = this.baseDodge;
    if (this.equipped.boots?.dodge) d += this.equipped.boots.dodge;
    return d;
  }

  gainXp(amount) {
    this.xp += amount;
    this.score += amount * 2;
    while (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.xp -= this.xpToNext;
    this.level += 1;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    this.maxHp += 20;
    this.hp = this.maxHp;
    this.maxMp += 10;
    this.mp = this.maxMp;
    this.baseAtk += 3;
    this.baseDef += 2;
    sfx.playLevelUp();
    showDungeonAlert(`🎉 Уровень повышен! Достигнут ${this.level} уровень Крипера!`);
    addCombatLog(`⭐ Крипер достиг ${this.level} уровня! Все силы восстановлены!`, "heal");
  }

  takeDamage(amount) {
    if (Math.random() < this.totalDodge) {
      addCombatLog(`💨 Крипер ловко увернулся от атаки!`, "heal");
      return 0;
    }

    const netDmg = Math.max(1, amount - this.totalDef);
    let rem = netDmg;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, rem);
      this.shield -= absorbed;
      rem -= absorbed;
      addCombatLog(`🛡️ Защитный слой поглотил ${absorbed} урона!`, "heal");
      if (this.shield <= 0 && !this.perks.has("charged_core")) {
        this.isCharged = false;
      }
    }

    this.hp = Math.max(0, this.hp - rem);

    // Проверка Тотема Бессмертия
    if (this.hp <= 0 && this.hasTotem) {
      this.hasTotem = false;
      this.hp = Math.floor(this.maxHp * 0.6);
      this.shield += 30;
      sfx.playLevelUp();
      showDungeonAlert("🗿 Тотем Бессмертия спас Крипера от гибели!");
      addCombatLog("🗿 Тотем Бессмертия вспыхнул и вернул вас к жизни!", "heal");
      return 0;
    }

    if (this.hp <= 0) {
      this.isAlive = false;
    }
    return rem;
  }
}

// ==========================================
// МОНСТРЫ
// ==========================================
class Monster {
  constructor(x, y, data, stage = 1, isBoss = false) {
    this.x = x;
    this.y = y;
    this.type = data.type;
    this.name = data.name;
    this.icon = data.icon;
    this.isBoss = isBoss;
    this.isAlive = true;
    this.alerted = false;

    const mult = 1 + (stage - 1) * 0.35;
    this.hp = Math.floor(data.hp * mult);
    this.maxHp = this.hp;
    this.atk = Math.floor(data.atk * mult);
    this.xp = Math.floor(data.xp * mult);
  }
}

// ==========================================
// ГЕНЕРАТОР КАРТЫ ПОДЗЕМЕЛЬЯ
// ==========================================
class DungeonMap {
  constructor(width, height, stage = 1, subLevel = 1) {
    this.width = width;
    this.height = height;
    this.stage = stage;
    this.subLevel = subLevel;
    this.tiles = Array.from({ length: height }, () => Array(width).fill(Tile.WALL));
    this.explored = Array.from({ length: height }, () => Array(width).fill(false));
    this.visible = Array.from({ length: height }, () => Array(width).fill(false));

    this.rooms = [];
    this.monsters = [];
    this.chests = new Set();
    this.shrines = new Set();
    this.stairsPos = { x: 0, y: 0 };
    this.stairsLocked = (subLevel === 3); // На уровне босса лестница заперта до его победы
    this.bossDefeated = false;

    this.generate();
  }

  generate() {
    const numRooms = 7;
    for (let i = 0; i < numRooms; i++) {
      const w = Math.floor(Math.random() * 5) + 5;
      const h = Math.floor(Math.random() * 4) + 4;
      const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
      const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

      const newRoom = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
      let overlap = false;

      for (let r of this.rooms) {
        if (
          x <= r.x + r.w + 1 &&
          x + w + 1 >= r.x &&
          y <= r.y + r.h + 1 &&
          y + h + 1 >= r.y
        ) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        this.carveRoom(newRoom);
        if (this.rooms.length > 0) {
          const prev = this.rooms[this.rooms.length - 1];
          this.carveCorridor(prev.cx, prev.cy, newRoom.cx, newRoom.cy);
        }
        this.rooms.push(newRoom);
      }
    }

    // Лестница на следующий уровень/этап — в последней комнате
    const lastRoom = this.rooms[this.rooms.length - 1];
    this.stairsPos = { x: lastRoom.cx, y: lastRoom.cy };
    this.tiles[lastRoom.cy][lastRoom.cx] = Tile.STAIRS;

    const currentStageData = STAGES[this.stage - 1] || STAGES[0];

    // Спавн Босса в последней комнате (если уровень 3)
    if (this.subLevel === 3) {
      const bx = lastRoom.cx > lastRoom.x + 1 ? lastRoom.cx - 1 : lastRoom.cx + 1;
      const by = lastRoom.cy;
      const bossData = currentStageData.boss;
      const boss = new Monster(bx, by, bossData, this.stage, true);
      this.monsters.push(boss);
    }

    // Расстановка монстров и сокровищ в остальных комнатах
    for (let idx = 1; idx < this.rooms.length; idx++) {
      const room = this.rooms[idx];

      // Обычные монстры (в комнатах до босса)
      if (idx !== this.rooms.length - 1 || this.subLevel !== 3) {
        const count = Math.floor(Math.random() * 2) + 1;
        for (let k = 0; k < count; k++) {
          const mx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
          const my = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
          if (mx !== this.stairsPos.x || my !== this.stairsPos.y) {
            const mData = currentStageData.monsters[Math.floor(Math.random() * currentStageData.monsters.length)];
            this.monsters.push(new Monster(mx, my, mData, this.stage, false));
          }
        }
      }

      // Сундуки (шанс 50%)
      if (Math.random() < 0.5) {
        const cx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const cy = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        this.chests.add(`${cx},${cy}`);
      }

      // Алтарь исцеления (шанс 25%)
      if (Math.random() < 0.25) {
        const sx = room.cx;
        const sy = room.cy;
        if (sx !== this.stairsPos.x || sy !== this.stairsPos.y) {
          this.shrines.add(`${sx},${sy}`);
        }
      }
    }
  }

  carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        this.tiles[y][x] = Tile.FLOOR;
      }
    }
  }

  carveCorridor(x1, y1, x2, y2) {
    let cx = x1;
    let cy = y1;
    while (cx !== x2) {
      this.tiles[cy][cx] = Tile.FLOOR;
      cx += cx < x2 ? 1 : -1;
    }
    while (cy !== y2) {
      this.tiles[cy][cx] = Tile.FLOOR;
      cy += cy < y2 ? 1 : -1;
    }
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const t = this.tiles[y][x];
    return t !== Tile.WALL && t !== Tile.DOOR_CLOSED;
  }

  computeFOV(px, py, radius = 7) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visible[y][x] = false;
      }
    }

    for (let r = 0; r < 360; r += 2) {
      const rad = (r * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);

      let cx = px + 0.5;
      let cy = py + 0.5;

      for (let step = 0; step < radius; step++) {
        const tx = Math.floor(cx);
        const ty = Math.floor(cy);

        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) break;

        this.visible[ty][tx] = true;
        this.explored[ty][tx] = true;

        if (this.tiles[ty][tx] === Tile.WALL) break;

        cx += dx;
        cy += dy;
      }
    }
  }
}

// ==========================================
// ГЛАВНЫЙ ИГРОВОЙ ДВИЖОК
// ==========================================
class GameEngine {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.avatarCanvas = document.getElementById("heroAvatarCanvas");

    // Этапы и прогрессия
    this.stage = 1;      // 1 to 5
    this.subLevel = 1;   // 1 to 3 (3 = Босс этапа!)
    this.turns = 0;

    this.particles = [];
    this.damageTexts = [];
    this.ambientParticles = [];

    this.isPrimed = false;
    this.primeProgress = 0;
    this.selectedPerk = null;

    this.initMap();
    this.initAmbientParticles();
    this.bindEvents();
    this.updateHUD();

    // Запуск цикла рендеринга
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.renderLoop(t));

    addCombatLog("⚔️ Крипер ступил во тьму Верхнего мира...", "floor");
    showDungeonAlert("Управление: WASD для шага/атаки, 1-4 — детонация и умения!");
  }

  initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 28; i++) {
      this.ambientParticles.push({
        x: Math.random() * (MAP_WIDTH * TILE_SIZE),
        y: Math.random() * (MAP_HEIGHT * TILE_SIZE),
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 15 - 5,
        size: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.7 + 0.2
      });
    }
  }

  initMap() {
    this.map = new DungeonMap(MAP_WIDTH, MAP_HEIGHT, this.stage, this.subLevel);
    const startRoom = this.map.rooms[0];
    if (!this.player) {
      this.player = new Player(startRoom.cx, startRoom.cy);
    } else {
      this.player.x = startRoom.cx;
      this.player.y = startRoom.cy;
    }
    this.map.computeFOV(this.player.x, this.player.y);

    if (this.subLevel === 3) {
      const stageData = STAGES[this.stage - 1];
      showDungeonAlert(`⚠️ ВНИМАНИЕ: ЛОГОВО БОССА! Одолейте [${stageData.boss.name}], чтобы открыть портал!`);
      addCombatLog(`👑 Логово Босса: ${stageData.boss.name} ждёт вас в глубине!`, "floor");
    }
  }

  // Переход по лестнице: либо следующий подуровень, либо завершение этапа
  handleStairs() {
    if (this.player.x !== this.map.stairsPos.x || this.player.y !== this.map.stairsPos.y) {
      showDungeonAlert("Сначала доберитесь до лестницы (🪜)!");
      return;
    }

    // Если на уровне босса и лестница заперта
    if (this.map.stairsLocked) {
      showDungeonAlert("🔒 Спуск запечатан! Сначала одолейте Босса этапа!");
      return;
    }

    // Обычный переход внутри этапа (1 -> 2 или 2 -> 3)
    if (this.subLevel < 3) {
      this.subLevel += 1;
      sfx.playLevelUp();
      showDungeonAlert(`🪜 Вы перешли на Уровень ${this.stage}-${this.subLevel}!`);
      addCombatLog(`🪜 Спуск в неизведанную тьму: Уровень ${this.stage}-${this.subLevel}`, "floor");

      // Сохраняем прогресс Крипера и восстанавливаем немного сил
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
      this.player.score += 75;

      this.initMap();
      this.updateHUD();
      return;
    }

    // Победа на 3-м уровне: Завершение текущего этапа!
    if (this.stage < 5) {
      this.openStageCompleteModal();
    } else {
      // Финал игры: повержен Дракон Края!
      this.openVictoryModal();
    }
  }

  openStageCompleteModal() {
    sfx.playVictory();
    const stageData = STAGES[this.stage - 1];
    document.getElementById("scTitle").textContent = `${stageData.name} успешно завершён!`;
    document.getElementById("scSubtitle").textContent = `Босс ${stageData.boss.name} повержен! Выберите благословение Крипера перед спуском в ${STAGES[this.stage].name}:`;

    // Выбираем 3 случайных перка
    const container = document.getElementById("perksContainer");
    container.innerHTML = "";

    const availablePerks = PERKS.filter(p => !this.player.perks.has(p.id));
    const shuffled = [...availablePerks].sort(() => 0.5 - Math.random());
    const selected3 = shuffled.slice(0, 3);

    this.selectedPerk = selected3[0] || null;

    selected3.forEach((perk, idx) => {
      const card = document.createElement("div");
      card.className = `perk-card ${idx === 0 ? "selected" : ""}`;
      card.innerHTML = `
        <span class="perk-icon">${perk.icon}</span>
        <span class="perk-title">${perk.name}</span>
        <span class="perk-desc">${perk.desc}</span>
        <span class="perk-tag">${perk.tag}</span>
      `;

      card.addEventListener("click", () => {
        document.querySelectorAll(".perk-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        this.selectedPerk = perk;
      });

      container.appendChild(card);
    });

    document.getElementById("stageCompleteModal").classList.add("active");
  }

  advanceToNextStage() {
    document.getElementById("stageCompleteModal").classList.remove("active");

    // Применяем выбранный перк
    if (this.selectedPerk) {
      this.selectedPerk.apply(this.player);
      this.player.perks.add(this.selectedPerk.id);
      addCombatLog(`⭐ Вы получили дар: «${this.selectedPerk.name}»!`, "heal");
    }

    this.stage += 1;
    this.subLevel = 1;
    this.player.score += 250;
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;

    const newStageData = STAGES[this.stage - 1];
    showDungeonAlert(`🌍 Добро пожаловать в ${newStageData.name}: ${newStageData.subName}!`);
    addCombatLog(`🌍 Переход в новое измерение: ${newStageData.name}`, "floor");

    this.initMap();
    this.initAmbientParticles();
    this.updateHUD();
  }

  openVictoryModal() {
    sfx.playVictory();
    document.getElementById("vicLevel").textContent = this.player.level;
    document.getElementById("vicScore").textContent = this.player.score;
    document.getElementById("vicTurns").textContent = this.turns;
    document.getElementById("victoryModal").classList.add("active");
  }

  // Перемещение и атака игрока
  handlePlayerMove(dx, dy) {
    if (!this.player.isAlive) return;
    sfx.init();

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // Проверка атаки по врагу
    const monster = this.map.monsters.find(m => m.isAlive && m.x === nx && m.y === ny);
    if (monster) {
      this.playerAttack(monster);
      this.endTurn();
      return;
    }

    // Проверка сундука
    const chestKey = `${nx},${ny}`;
    if (this.map.chests.has(chestKey)) {
      this.openChest(nx, ny);
      this.endTurn();
      return;
    }

    // Проверка алтаря
    const shrineKey = `${nx},${ny}`;
    if (this.map.shrines.has(shrineKey)) {
      this.useShrine(nx, ny);
      this.endTurn();
      return;
    }

    // Обычный шаг
    if (this.map.isWalkable(nx, ny)) {
      this.player.x = nx;
      this.player.y = ny;
      sfx.playStep();

      // Проверка на лестницу
      if (nx === this.map.stairsPos.x && ny === this.map.stairsPos.y) {
        if (this.map.stairsLocked) {
          showDungeonAlert("🔒 Врата запечатаны! Одолейте Босса этапа!");
        } else {
          showDungeonAlert("Нажмите [>] или кнопку «Спуск» для перехода в следующий уровень/этап!");
        }
      }

      this.map.computeFOV(this.player.x, this.player.y);
      this.endTurn();
    }
  }

  playerAttack(monster) {
    sfx.playHit();
    const isCrit = Math.random() < this.player.totalCrit;
    const dmg = isCrit ? Math.floor(this.player.totalAtk * 1.8) : this.player.totalAtk;

    monster.hp -= dmg;
    this.spawnDamageText(monster.x, monster.y, `-${dmg}`, isCrit ? "#f59e0b" : "#ff3366");
    this.spawnParticles(monster.x * TILE_SIZE + 18, monster.y * TILE_SIZE + 18, "#ff3366", 8);

    const critTxt = isCrit ? " [КРИТИЧЕСКИЙ ВЗРЫВ!]" : "";
    addCombatLog(`🗡️ Крипер атаковал ${monster.name} на ${dmg} урона${critTxt}!`, "damage-monster");

    if (monster.hp <= 0) {
      monster.isAlive = false;
      this.player.gainXp(monster.xp);
      addCombatLog(`💀 ${monster.name} повержен! (+${monster.xp} XP)`, "loot");

      // Победа над Боссом этапа!
      if (monster.isBoss) {
        this.map.bossDefeated = true;
        this.map.stairsLocked = false;
        sfx.playLevelUp();
        showDungeonAlert("👑 БОСС ЭТАПА ПОВЕРЖЕН! Врата в следующий биом открыты!");
        addCombatLog("✨ Врата биома открылись! Лестница разблокирована!", "heal");

        // Гарантированный эпический лут с босса
        const epicItem = ITEM_DB.filter(it => it.rarity === Rarity.EPIC || it.rarity === Rarity.LEGENDARY)[Math.floor(Math.random() * 4)];
        if (epicItem) {
          this.player.inventory.push(epicItem);
          addCombatLog(`🎁 С босса выпал легендарный трофей: ${epicItem.name}!`, "loot");
        }
      } else {
        // Шанс лута с обычного монстра (60%)
        if (Math.random() < 0.6) {
          const item = this.getRandomItem();
          this.player.inventory.push(item);
          addCombatLog(`✨ Вы нашли предмет: ${item.name}`, "loot");
        }
      }
    }
  }

  openChest(x, y) {
    this.map.chests.delete(`${x},${y}`);
    sfx.playLoot();
    const item = this.getRandomItem();
    this.player.inventory.push(item);
    showDungeonAlert(`🧰 В сундуке обнаружено: ${item.name}!`);
    addCombatLog(`🧰 Крипер открыл сундук и получил ${item.name}!`, "loot");
    this.spawnParticles(x * TILE_SIZE + 18, y * TILE_SIZE + 18, "#ffb834", 16);
  }

  useShrine(x, y) {
    this.map.shrines.delete(`${x},${y}`);
    sfx.playLoot();
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.shield += 30;
    showDungeonAlert("✨ Алтарь Богов восстановил HP и MP, дав +30 щита!");
    addCombatLog("✨ Алтарь наполнил Крипера благословением!", "heal");
    this.spawnParticles(x * TILE_SIZE + 18, y * TILE_SIZE + 18, "#22c55e", 20);
  }

  // ==========================================
  // СПОСОБНОСТИ КРИПЕРА (1-4)
  // ==========================================
  castSkill(num) {
    if (!this.player.isAlive) return;
    sfx.init();

    if (this.player.skillsCd[num] > 0) {
      showDungeonAlert("Способность ещё восстанавливается!");
      return;
    }

    if (num === 1) { // 💥 Детонация ("Тсссс... БУМ!")
      const cost = 15;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      this.player.mp -= cost;
      this.player.skillsCd[1] = 3;

      // Звуковой эффект: шипение фитиля и взрыв!
      sfx.playHiss();
      setTimeout(() => sfx.playExplosion(), 120);

      const rad = 2 + (this.player.bonusExplosionRadius || 0);
      const baseDmg = Math.floor((36 + this.player.level * 6) * (1 + (this.player.bonusExplosionDmg || 0)));

      let hits = 0;
      for (let m of this.map.monsters) {
        if (m.isAlive && Math.abs(m.x - this.player.x) <= rad && Math.abs(m.y - this.player.y) <= rad) {
          m.hp -= baseDmg;
          hits++;
          this.spawnDamageText(m.x, m.y, `-${baseDmg} 💥`, "#ffaa00");
          if (m.hp <= 0) {
            m.isAlive = false;
            this.player.gainXp(m.xp);
            if (m.isBoss) {
              this.map.bossDefeated = true;
              this.map.stairsLocked = false;
              showDungeonAlert("👑 БОСС ЭТАПА ПОВЕРЖЕН ВЗРЫВОМ!");
            }
          }
        }
      }

      // Частицы детонации
      this.spawnParticles(this.player.x * TILE_SIZE + 18, this.player.y * TILE_SIZE + 18, "#ffaa00", 35);
      this.spawnParticles(this.player.x * TILE_SIZE + 18, this.player.y * TILE_SIZE + 18, "#22c55e", 15);
      showDungeonAlert("💥 Тсссс... БУМ! Мощная детонация пороха!");
      addCombatLog(`💥 Детонация Крипера поразила ${hits} врагов на ${baseDmg} урона!`, "damage-monster");

      this.endTurn();

    } else if (num === 2) { // 🌪️ Пороховой вихрь
      const cost = 20;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      this.player.mp -= cost;
      this.player.skillsCd[2] = 4;
      sfx.playHit();
      sfx.playExplosion();

      let hits = 0;
      for (let m of this.map.monsters) {
        if (m.isAlive && Math.abs(m.x - this.player.x) <= 2 && Math.abs(m.y - this.player.y) <= 2) {
          const dmg = 25 + this.player.totalAtk;
          m.hp -= dmg;
          hits++;
          this.spawnDamageText(m.x, m.y, `-${dmg}`, "#38bdf8");
          if (m.hp <= 0) {
            m.isAlive = false;
            this.player.gainXp(m.xp);
            if (m.isBoss) {
              this.map.bossDefeated = true;
              this.map.stairsLocked = false;
            }
          }
        }
      }
      this.spawnParticles(this.player.x * TILE_SIZE + 18, this.player.y * TILE_SIZE + 18, "#38bdf8", 25);
      addCombatLog(`🌪️ Пороховой вихрь задел ${hits} врагов вокруг!`, "damage-monster");
      this.endTurn();

    } else if (num === 3) { // 👣 Скрытный подкрад
      const cost = 12;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      const target = this.map.monsters.find(m => m.isAlive && this.map.visible[m.y][m.x]);
      if (!target) { showDungeonAlert("Нет видимого врага для бесшумного подкрада!"); return; }

      this.player.mp -= cost;
      this.player.skillsCd[3] = 4;
      sfx.playHiss();
      sfx.playHit();

      this.player.x = target.x;
      this.player.y = target.y;
      const dmg = Math.floor(this.player.totalAtk * 2.5);
      target.hp -= dmg;
      this.spawnDamageText(target.x, target.y, `КРИТ -${dmg} 👣`, "#a855f7");
      this.spawnParticles(target.x * TILE_SIZE + 18, target.y * TILE_SIZE + 18, "#22c55e", 20);
      addCombatLog(`👣 Бесшумный подкрад: Крипер возник за спиной ${target.name} (-${dmg})!`, "damage-monster");

      if (target.hp <= 0) {
        target.isAlive = false;
        this.player.gainXp(target.xp);
        if (target.isBoss) {
          this.map.bossDefeated = true;
          this.map.stairsLocked = false;
        }
      }
      this.map.computeFOV(this.player.x, this.player.y);
      this.endTurn();

    } else if (num === 4) { // ⚡ Заряд молнии (Заряженный Крипер!)
      const cost = 10;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      this.player.mp -= cost;
      this.player.skillsCd[4] = 5;

      sfx.playChargedLightning();
      const shieldVal = 40 + this.player.level * 8;
      this.player.shield += shieldVal;
      this.player.isCharged = true;

      showDungeonAlert(`⚡ В вас ударила молния! Вы стали Заряженным Крипером (+${shieldVal} щита)!`);
      addCombatLog(`⚡ Удар молнии зарядил Крипера! Щит: +${shieldVal}, урон увеличен!`, "heal");
      this.spawnParticles(this.player.x * TILE_SIZE + 18, this.player.y * TILE_SIZE + 18, "#00f0ff", 28);
      this.endTurn();
    }
  }

  endTurn() {
    this.turns += 1;

    // Регенерация маны (1 MP за ход)
    this.player.mp = Math.min(this.player.maxMp, this.player.mp + 1);

    // Пассивная регенерация HP от перка моба
    if (this.player.regenHpPerTurn > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regenHpPerTurn);
    }

    // Уменьшение кулдаунов способностей
    for (let k in this.player.skillsCd) {
      if (this.player.skillsCd[k] > 0) this.player.skillsCd[k] -= 1;
    }

    // Ход монстров
    for (let m of this.map.monsters) {
      if (!m.isAlive) continue;

      const dist = Math.abs(m.x - this.player.x) + Math.abs(m.y - this.player.y);
      if (this.map.visible[m.y][m.x] || dist <= 6) m.alerted = true;

      if (!m.alerted) continue;

      // Ближний бой
      if (dist === 1) {
        const dmg = this.player.takeDamage(m.atk);
        sfx.playHit();
        this.spawnDamageText(this.player.x, this.player.y, `-${dmg}`, "#ff3366");
        addCombatLog(`💥 ${m.name} нанёс вам ${dmg} урона!`, "damage-player");
      }
      // Лучник / Дальний бой
      else if ((m.type === "skeleton" || m.type === "blaze") && dist >= 2 && dist <= 5 && this.map.visible[m.y][m.x]) {
        const dmg = this.player.takeDamage(m.atk);
        sfx.playHit();
        this.spawnDamageText(this.player.x, this.player.y, `-${dmg} 🏹`, "#ff3366");
        addCombatLog(`🏹 ${m.name} выстрелил в вас (${dmg} урона)!`, "damage-player");
      }
      // Перемещение монстра к игроку
      else {
        const dx = Math.sign(this.player.x - m.x);
        const dy = Math.sign(this.player.y - m.y);
        const nx = m.x + dx;
        const ny = m.y + dy;

        if (this.map.isWalkable(nx, ny) && !(nx === this.player.x && ny === this.player.y)) {
          m.x = nx;
          m.y = ny;
        } else if (this.map.isWalkable(m.x, m.y + dy)) {
          m.y += dy;
        } else if (this.map.isWalkable(m.x + dx, m.y)) {
          m.x += dx;
        }
      }
    }

    this.updateHUD();

    if (!this.player.isAlive) {
      this.showGameOver();
    }
  }

  getRandomItem() {
    return ITEM_DB[Math.floor(Math.random() * ITEM_DB.length)];
  }

  spawnDamageText(x, y, text, color) {
    this.damageTexts.push({
      x: x * TILE_SIZE + 18,
      y: y * TILE_SIZE + 10,
      text,
      color,
      life: 1.0
    });
  }

  spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        life: 1.0
      });
    }
  }

  // ==========================================
  // ГРАФИЧЕСКИЙ РЕНДЕР КАНВАСА
  // ==========================================
  renderLoop(time) {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const t = time / 1000;

    const currentStageData = STAGES[this.stage - 1] || STAGES[0];
    const theme = currentStageData.theme;

    // Фоновая заливка биома
    this.ctx.fillStyle = "#0c0d12";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Центрирование камеры на Крипере
    const offsetX = Math.floor(this.canvas.width / 2 - (this.player.x + 0.5) * TILE_SIZE);
    const offsetY = Math.floor(this.canvas.height / 2 - (this.player.y + 0.5) * TILE_SIZE);

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // Отрисовка тайлов карты с палитрой биома
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const isExp = this.map.explored[y][x];
        const isVis = this.map.visible[y][x];

        if (!isExp) continue;

        const rx = x * TILE_SIZE;
        const ry = y * TILE_SIZE;
        const tile = this.map.tiles[y][x];

        // Пол
        if (tile === Tile.FLOOR || tile === Tile.STAIRS) {
          this.ctx.fillStyle = isVis ? theme.floorVisible : theme.floorExplored;
          this.ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
          this.ctx.strokeStyle = isVis ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.5)";
          this.ctx.strokeRect(rx, ry, TILE_SIZE, TILE_SIZE);
        }
        // Стена
        else if (tile === Tile.WALL) {
          this.ctx.fillStyle = isVis ? theme.wallVisible : theme.wallExplored;
          this.ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
          // Блик на верхней грани стены
          this.ctx.fillStyle = isVis ? theme.wallTop : theme.wallExplored;
          this.ctx.fillRect(rx, ry, TILE_SIZE, 4);
        }

        if (isVis) {
          // Сундук
          if (this.map.chests.has(`${x},${y}`)) {
            this.ctx.font = "20px serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("🧰", rx + 18, ry + 18);
          }
          // Алтарь
          else if (this.map.shrines.has(`${x},${y}`)) {
            this.ctx.font = "20px serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText("✨", rx + 18, ry + 18);
          }
          // Лестница
          else if (x === this.map.stairsPos.x && y === this.map.stairsPos.y) {
            this.ctx.font = "22px serif";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            if (this.map.stairsLocked) {
              this.ctx.fillText("🔒", rx + 18, ry + 18);
            } else {
              this.ctx.fillText("🪜", rx + 18, ry + 18);
              // Свечение открытого портала
              const pGlow = Math.sin(t * 6) * 0.2 + 0.3;
              this.ctx.fillStyle = `rgba(34, 197, 94, ${pGlow})`;
              this.ctx.beginPath();
              this.ctx.arc(rx + 18, ry + 18, 14, 0, Math.PI * 2);
              this.ctx.fill();
            }
          }
        }
      }
    }

    // Летающие атмосферные частицы биома
    this.ctx.fillStyle = theme.particleColor;
    for (let p of this.ambientParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < 0) p.y = MAP_HEIGHT * TILE_SIZE;
      if (p.x < 0) p.x = MAP_WIDTH * TILE_SIZE;
      if (p.x > MAP_WIDTH * TILE_SIZE) p.x = 0;

      const tx = Math.floor(p.x / TILE_SIZE);
      const ty = Math.floor(p.y / TILE_SIZE);
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT && this.map.visible[ty][tx]) {
        this.ctx.globalAlpha = p.alpha;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1.0;

    // Отрисовка монстров
    for (let m of this.map.monsters) {
      if (!m.isAlive || !this.map.visible[m.y][m.x]) continue;

      const mx = m.x * TILE_SIZE;
      const my = m.y * TILE_SIZE;

      // Свечение ауры босса
      if (m.isBoss) {
        const bGlow = this.ctx.createRadialGradient(mx + 18, my + 18, 6, mx + 18, my + 18, 28);
        bGlow.addColorStop(0, "rgba(239, 68, 68, 0.45)");
        bGlow.addColorStop(1, "rgba(239, 68, 68, 0)");
        this.ctx.fillStyle = bGlow;
        this.ctx.beginPath();
        this.ctx.arc(mx + 18, my + 18, 28, 0, Math.PI * 2);
        this.ctx.fill();

        // Корона над головой босса
        this.ctx.font = "14px serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("👑", mx + 18, my - 12);
      }

      // Иконка монстра
      this.ctx.font = m.isBoss ? "28px serif" : "22px serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(m.icon, mx + 18, my + 18);

      // Полоска HP монстра
      const hpPct = Math.max(0, m.hp / m.maxHp);
      const barW = m.isBoss ? 34 : 28;
      const barX = m.isBoss ? mx + 1 : mx + 4;
      this.ctx.fillStyle = "rgba(0,0,0,0.75)";
      this.ctx.fillRect(barX, my - 6, barW, m.isBoss ? 5 : 4);
      this.ctx.fillStyle = m.isBoss ? "#ef4444" : "#ff3366";
      this.ctx.fillRect(barX, my - 6, barW * hpPct, m.isBoss ? 5 : 4);
    }

    // Отрисовка игрока (Каноничный пиксельный Крипер!)
    if (this.player.isAlive) {
      const px = this.player.x * TILE_SIZE;
      const py = this.player.y * TILE_SIZE;
      drawCreeper(this.ctx, px, py, TILE_SIZE, {
        t,
        isCharged: (this.player.shield > 0 || this.player.isCharged),
        isPrimed: this.isPrimed,
        primeProgress: this.primeProgress,
        shield: this.player.shield
      });
    }

    // Частицы боевых эффектов
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 1.5;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;

    // Всплывающие цифры урона
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.y -= dt * 25;
      dtObj.life -= dt * 1.2;
      if (dtObj.life <= 0) {
        this.damageTexts.splice(i, 1);
        continue;
      }
      this.ctx.fillStyle = dtObj.color;
      this.ctx.globalAlpha = dtObj.life;
      this.ctx.font = "bold 14px 'JetBrains Mono', monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();

    // Обновляем аватарку в левой панели UI
    renderHeroAvatar(this.avatarCanvas, (this.player.shield > 0 || this.player.isCharged));

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  // Обновление интерфейса HUD
  updateHUD() {
    const stageData = STAGES[this.stage - 1] || STAGES[0];
    document.getElementById("stageBadge").textContent = stageData.name;
    document.getElementById("floorBadge").textContent = `Уровень ${this.stage}-${this.subLevel}`;

    // Обновление прогресс-бара текущего этапа
    const d1 = document.getElementById("spDot1");
    const d2 = document.getElementById("spDot2");
    const d3 = document.getElementById("spDot3");
    const l1 = document.getElementById("spLine1");
    const l2 = document.getElementById("spLine2");

    d1.className = `sp-dot ${this.subLevel === 1 ? "active" : "completed"}`;
    l1.className = `sp-line ${this.subLevel >= 2 ? "completed" : ""}`;
    d2.className = `sp-dot ${this.subLevel === 2 ? "active" : this.subLevel > 2 ? "completed" : ""}`;
    l2.className = `sp-line ${this.subLevel >= 3 ? "completed" : ""}`;
    d3.className = `sp-dot boss-dot ${this.subLevel === 3 ? "active" : ""}`;

    // Бейдж Заряженного Крипера
    const chargedEl = document.getElementById("heroChargedBadge");
    if (this.player.shield > 0 || this.player.isCharged) {
      chargedEl.style.display = "inline-block";
    } else {
      chargedEl.style.display = "none";
    }

    document.getElementById("playerLevel").textContent = this.player.level;
    document.getElementById("playerScore").textContent = this.player.score;

    const xpPct = (this.player.xp / this.player.xpToNext) * 100;
    document.getElementById("xpBarFill").style.width = `${xpPct}%`;
    document.getElementById("xpText").textContent = `${this.player.xp} / ${this.player.xpToNext} XP`;

    // HP & MP
    const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
    document.getElementById("hpBar").style.width = `${hpPct}%`;
    document.getElementById("hpText").textContent = `${this.player.hp} / ${this.player.maxHp}`;

    if (this.player.shield > 0) {
      document.getElementById("shieldBar").style.width = `${Math.min(100, (this.player.shield / this.player.maxHp) * 100)}%`;
    } else {
      document.getElementById("shieldBar").style.width = "0%";
    }

    const mpPct = Math.max(0, (this.player.mp / this.player.maxMp) * 100);
    document.getElementById("mpBar").style.width = `${mpPct}%`;
    document.getElementById("mpText").textContent = `${this.player.mp} / ${this.player.maxMp}`;

    // Статы
    document.getElementById("statAttack").textContent = this.player.totalAtk;
    document.getElementById("statDefense").textContent = this.player.totalDef;
    document.getElementById("statCrit").textContent = `${Math.round(this.player.totalCrit * 100)}%`;
    document.getElementById("statDodge").textContent = `${Math.round(this.player.totalDodge * 100)}%`;

    // Экипировка
    document.getElementById("equipWeaponName").textContent = this.player.equipped.weapon?.name || "Кулаки";
    document.getElementById("equipArmorName").textContent = this.player.equipped.armor?.name || "Нет";
    document.getElementById("equipAccessoryName").textContent = this.player.equipped.accessory?.name || "Нет";
    document.getElementById("equipBootsName").textContent = this.player.equipped.boots?.name || "Нет";

    document.getElementById("invCountBadge").textContent = `${this.player.inventory.length}/16`;

    // Кулдауны способностей
    for (let i = 1; i <= 4; i++) {
      const cdEl = document.getElementById(`cd${i}`);
      const btn = document.getElementById(`skill${i}`);
      const cd = this.player.skillsCd[i];
      if (cd > 0) {
        cdEl.style.height = "100%";
        btn.disabled = true;
      } else {
        cdEl.style.height = "0%";
        btn.disabled = false;
      }
    }
  }

  showGameOver() {
    document.getElementById("goStage").textContent = `Этап ${this.stage}`;
    document.getElementById("goFloor").textContent = `${this.stage}-${this.subLevel}`;
    document.getElementById("goLevel").textContent = this.player.level;
    document.getElementById("goScore").textContent = this.player.score;
    document.getElementById("gameOverModal").classList.add("active");
  }

  bindEvents() {
    // Клавиатура
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      if (["w", "arrowup", "ц"].includes(key)) {
        this.handlePlayerMove(0, -1);
      } else if (["s", "arrowdown", "ы"].includes(key)) {
        this.handlePlayerMove(0, 1);
      } else if (["a", "arrowleft", "ф"].includes(key)) {
        this.handlePlayerMove(-1, 0);
      } else if (["d", "arrowright", "в"].includes(key)) {
        this.handlePlayerMove(1, 0);
      } else if ([" ", "."].includes(key)) {
        addCombatLog("⏳ Крипер выжидает удобного момента...", "floor");
        this.endTurn();
      } else if (["1", "2", "3", "4"].includes(key)) {
        this.castSkill(parseInt(key));
      } else if (["i", "ш"].includes(key)) {
        this.toggleInventory();
      } else if ([">", "э"].includes(key)) {
        this.handleStairs();
      }
    });

    // Клик по канвасу (ход в клетку или атака)
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const offsetX = Math.floor(this.canvas.width / 2 - (this.player.x + 0.5) * TILE_SIZE);
      const offsetY = Math.floor(this.canvas.height / 2 - (this.player.y + 0.5) * TILE_SIZE);

      const targetTileX = Math.floor((clickX - offsetX) / TILE_SIZE);
      const targetTileY = Math.floor((clickY - offsetY) / TILE_SIZE);

      const dx = targetTileX - this.player.x;
      const dy = targetTileY - this.player.y;

      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0)) {
        this.handlePlayerMove(dx, dy);
      }
    });

    // Экранный DPAD
    document.getElementById("dpadUp").addEventListener("click", () => this.handlePlayerMove(0, -1));
    document.getElementById("dpadDown").addEventListener("click", () => this.handlePlayerMove(0, 1));
    document.getElementById("dpadLeft").addEventListener("click", () => this.handlePlayerMove(-1, 0));
    document.getElementById("dpadRight").addEventListener("click", () => this.handlePlayerMove(1, 0));
    document.getElementById("dpadCenter").addEventListener("click", () => {
      addCombatLog("⏳ Крипер выжидает...", "floor");
      this.endTurn();
    });

    // Быстрые кнопки
    document.getElementById("btnWait").addEventListener("click", () => {
      addCombatLog("⏳ Крипер выжидает...", "floor");
      this.endTurn();
    });

    document.getElementById("btnStairs").addEventListener("click", () => this.handleStairs());

    // Способности
    for (let i = 1; i <= 4; i++) {
      document.getElementById(`skill${i}`).addEventListener("click", () => this.castSkill(i));
    }

    // Инвентарь
    document.getElementById("btnOpenInventory").addEventListener("click", () => this.toggleInventory());
    document.getElementById("btnCloseInventory").addEventListener("click", () => this.toggleInventory());

    // Справка
    document.getElementById("btnHelp").addEventListener("click", () => {
      document.getElementById("helpModal").classList.toggle("active");
    });
    document.getElementById("btnCloseHelp").addEventListener("click", () => {
      document.getElementById("helpModal").classList.remove("active");
    });

    // Звук
    document.getElementById("btnAudioToggle").addEventListener("click", (e) => {
      sfx.init();
      sfx.enabled = !sfx.enabled;
      e.target.textContent = sfx.enabled ? "🔊" : "🔇";
    });

    // Перезапуск
    document.getElementById("btnRestart").addEventListener("click", () => this.restartGame());
    document.getElementById("btnRestartGame").addEventListener("click", () => {
      document.getElementById("gameOverModal").classList.remove("active");
      this.restartGame();
    });

    // Переход на следующий этап из модалки
    document.getElementById("btnNextStage").addEventListener("click", () => this.advanceToNextStage());

    // Перезапуск из экрана победы (New Game+)
    document.getElementById("btnVictoryRestart").addEventListener("click", () => {
      document.getElementById("victoryModal").classList.remove("active");
      this.restartGame(true);
    });
  }

  restartGame(keepStats = false) {
    this.stage = 1;
    this.subLevel = 1;
    this.turns = 0;

    if (!keepStats) {
      this.player = null;
    } else {
      this.player.score += 500;
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
    }

    this.initMap();
    this.initAmbientParticles();
    this.updateHUD();
    addCombatLog("🔄 Новое приключение Крипера начато! Удачи!", "floor");
  }

  toggleInventory() {
    const modal = document.getElementById("inventoryModal");
    const isActive = modal.classList.toggle("active");
    if (isActive) {
      this.renderInventoryGrid();
    }
  }

  renderInventoryGrid() {
    const grid = document.getElementById("inventoryGrid");
    grid.innerHTML = "";

    this.player.inventory.forEach((item, idx) => {
      const cell = document.createElement("div");
      cell.className = `inv-cell rarity-${item.rarity.name === "Обычный" ? "common" : item.rarity.name === "Редкий" ? "rare" : item.rarity.name === "Эпический" ? "epic" : "legendary"}`;
      cell.textContent = item.icon || "📦";
      cell.title = item.name;

      cell.addEventListener("click", () => {
        document.querySelectorAll(".inv-cell").forEach(c => c.classList.remove("selected"));
        cell.classList.add("selected");
        this.showItemDetails(item, idx);
      });

      grid.appendChild(cell);
    });

    // Заполнение пустых ячеек до 16
    for (let i = this.player.inventory.length; i < 16; i++) {
      const empty = document.createElement("div");
      empty.className = "inv-cell";
      grid.appendChild(empty);
    }
  }

  showItemDetails(item, idx) {
    const details = document.getElementById("itemDetails");
    let bonusHtml = "";
    if (item.atk) bonusHtml += `<div>⚔️ Атака: +${item.atk}</div>`;
    if (item.def) bonusHtml += `<div>🛡️ Защита: +${item.def}</div>`;
    if (item.hp) bonusHtml += `<div>❤️ Здоровье: +${item.hp}</div>`;
    if (item.mp) bonusHtml += `<div>🌀 Мана: +${item.mp}</div>`;
    if (item.dodge) bonusHtml += `<div>💨 Уворот: +${Math.round(item.dodge * 100)}%</div>`;
    if (item.heal) bonusHtml += `<div>🧪 Восстановление HP: +${item.heal}</div>`;
    if (item.mana) bonusHtml += `<div>🧪 Восстановление MP: +${item.mana}</div>`;

    const isEquippable = ["weapon", "armor", "accessory", "boots"].includes(item.type);

    details.innerHTML = `
      <div>
        <div class="item-title">${item.name}</div>
        <div class="item-rarity-badge" style="color: ${item.rarity.color}">${item.rarity.name}</div>
        <div class="item-bonuses">${bonusHtml}</div>
      </div>
      <div class="item-action-btns">
        ${isEquippable ? `<button class="btn-item btn-item-equip" id="btnEquipItem">Надеть</button>` : `<button class="btn-item btn-item-use" id="btnUseItem">Использовать</button>`}
        <button class="btn-item btn-item-drop" id="btnDropItem">Выбросить</button>
      </div>
    `;

    if (isEquippable) {
      document.getElementById("btnEquipItem").addEventListener("click", () => {
        const old = this.player.equipped[item.type];
        this.player.equipped[item.type] = item;
        this.player.inventory.splice(idx, 1);
        if (old) this.player.inventory.push(old);
        sfx.playLoot();
        this.updateHUD();
        this.renderInventoryGrid();
        details.innerHTML = `<p class="empty-hint">Предмет надет!</p>`;
      });
    } else {
      document.getElementById("btnUseItem").addEventListener("click", () => {
        if (item.heal) this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.heal);
        if (item.mana) this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.mana);
        this.player.inventory.splice(idx, 1);
        sfx.playLoot();
        this.updateHUD();
        this.renderInventoryGrid();
        details.innerHTML = `<p class="empty-hint">Зелье выпито!</p>`;
      });
    }

    document.getElementById("btnDropItem").addEventListener("click", () => {
      this.player.inventory.splice(idx, 1);
      this.updateHUD();
      this.renderInventoryGrid();
      details.innerHTML = `<p class="empty-hint">Предмет выброшен.</p>`;
    });
  }
}

// Вспомогательные функции оповещений
function showDungeonAlert(msg) {
  const alert = document.getElementById("dungeonAlert");
  if (!alert) return;
  alert.textContent = msg;
  alert.classList.add("show");
  clearTimeout(alert._timer);
  alert._timer = setTimeout(() => {
    alert.classList.remove("show");
  }, 2400);
}

function addCombatLog(msg, type = "") {
  const log = document.getElementById("combatLog");
  if (!log) return;
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.textContent = msg;
  log.prepend(entry);

  if (log.children.length > 30) {
    log.removeChild(log.lastChild);
  }
}

// Запуск при загрузке страницы
window.addEventListener("DOMContentLoaded", () => {
  window.gameInstance = new GameEngine();
});
