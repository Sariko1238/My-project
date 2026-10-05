/**
 * ============================================================================
 * ХРОНИКИ БЕЗДНЫ (Dungeon Crawler RPG) — Web Canvas Edition
 * Полноценная 2D-графическая игра с освещением, анимациями, звуком и ИИ монстров
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
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch(e) {}
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.14);
    } catch(e) {}
  }

  playSpell() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(350, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
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

// База предметов
const ITEM_DB = [
  { name: "Ржавый кинжал", type: "weapon", rarity: Rarity.COMMON, atk: 4, icon: "🗡️" },
  { name: "Меч стража", type: "weapon", rarity: Rarity.RARE, atk: 9, icon: "⚔️" },
  { name: "Клинок теней", type: "weapon", rarity: Rarity.EPIC, atk: 16, crit: 0.15, icon: "🗡️" },
  { name: "Испепелитель Бездны", type: "weapon", rarity: Rarity.LEGENDARY, atk: 28, crit: 0.25, icon: "🔥" },

  { name: "Кожаный жилет", type: "armor", rarity: Rarity.COMMON, def: 3, hp: 15, icon: "🥋" },
  { name: "Кольчуга рыцаря", type: "armor", rarity: Rarity.RARE, def: 7, hp: 30, icon: "🛡️" },
  { name: "Латы титана", type: "armor", rarity: Rarity.EPIC, def: 14, hp: 60, icon: "🦺" },
  { name: "Эгида Бессмертного", type: "armor", rarity: Rarity.LEGENDARY, def: 22, hp: 120, icon: "👑" },

  { name: "Амулет стойкости", type: "accessory", rarity: Rarity.RARE, hp: 35, mp: 15, icon: "📿" },
  { name: "Кольцо звездопада", type: "accessory", rarity: Rarity.EPIC, atk: 5, mp: 40, icon: "💍" },
  { name: "Сапоги ветра", type: "boots", rarity: Rarity.RARE, def: 2, dodge: 0.1, icon: "👢" },

  { name: "Эликсир здоровья", type: "potion", rarity: Rarity.COMMON, heal: 40, icon: "🧪" },
  { name: "Эликсир маны", type: "potion", rarity: Rarity.COMMON, mana: 35, icon: "🧪" }
];

// ==========================================
// КЛАСС ГЕРОЯ
// ==========================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 50;
    this.score = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.mp = 50;
    this.maxMp = 50;
    this.shield = 0;

    this.baseAtk = 10;
    this.baseDef = 3;
    this.baseCrit = 0.08;
    this.baseDodge = 0.05;

    this.equipped = {
      weapon: { name: "Деревянный меч", type: "weapon", rarity: Rarity.COMMON, atk: 4, icon: "🗡️" },
      armor: { name: "Тканевая роба", type: "armor", rarity: Rarity.COMMON, def: 2, hp: 10, icon: "🥋" },
      accessory: null,
      boots: null
    };

    this.inventory = [
      { name: "Эликсир здоровья", type: "potion", rarity: Rarity.COMMON, heal: 45, icon: "🧪" },
      { name: "Эликсир маны", type: "potion", rarity: Rarity.COMMON, mana: 40, icon: "🧪" }
    ];

    this.skillsCd = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.isAlive = true;
  }

  get totalAtk() {
    let bonus = this.equipped.weapon ? (this.equipped.weapon.atk || 0) : 0;
    if (this.equipped.accessory?.atk) bonus += this.equipped.accessory.atk;
    return this.baseAtk + bonus;
  }

  get totalDef() {
    let bonus = this.equipped.armor ? (this.equipped.armor.def || 0) : 0;
    if (this.equipped.boots?.def) bonus += this.equipped.boots.def;
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
    showDungeonAlert(`🎉 Уровень повышен! Достигнут ${this.level} уровень!`);
    addCombatLog(`⭐ Вы достигли ${this.level} уровня! Все силы восстановлены!`, "heal");
  }

  takeDamage(amount) {
    if (Math.random() < this.totalDodge) {
      addCombatLog(`💨 Вы ловко увернулись от атаки!`, "heal");
      return 0;
    }

    const netDmg = Math.max(1, amount - this.totalDef);
    let rem = netDmg;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, rem);
      this.shield -= absorbed;
      rem -= absorbed;
      addCombatLog(`🛡️ Каменная кожа поглотила ${absorbed} урона!`, "heal");
    }

    this.hp = Math.max(0, this.hp - rem);
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
  constructor(x, y, type, floor = 1) {
    this.x = x;
    this.y = y;
    this.type = type; // "goblin", "archer", "assassin", "boss"
    this.isAlive = true;
    this.alerted = false;

    const mult = 1 + (floor - 1) * 0.35;

    if (type === "goblin") {
      this.name = "Гоблин-рубака";
      this.icon = "👺";
      this.hp = Math.floor(25 * mult);
      this.maxHp = this.hp;
      this.atk = Math.floor(10 * mult);
      this.xp = 20;
    } else if (type === "archer") {
      this.name = "Скелет-лучник";
      this.icon = "🏹";
      this.hp = Math.floor(18 * mult);
      this.maxHp = this.hp;
      this.atk = Math.floor(12 * mult);
      this.xp = 25;
    } else if (type === "assassin") {
      this.name = "Теневой ассасин";
      this.icon = "🥷";
      this.hp = Math.floor(32 * mult);
      this.maxHp = this.hp;
      this.atk = Math.floor(16 * mult);
      this.xp = 35;
    } else if (type === "boss") {
      this.name = "Владыка Бездны";
      this.icon = "👿";
      this.hp = Math.floor(120 * mult);
      this.maxHp = this.hp;
      this.atk = Math.floor(22 * mult);
      this.xp = 120;
    }
  }
}

// ==========================================
// ГЕНЕРАТОР КАРТЫ ПОДЗЕМЕЛЬЯ
// ==========================================
class DungeonMap {
  constructor(width, height, floor = 1) {
    this.width = width;
    this.height = height;
    this.floor = floor;
    this.tiles = Array.from({ length: height }, () => Array(width).fill(Tile.WALL));
    this.explored = Array.from({ length: height }, () => Array(width).fill(false));
    this.visible = Array.from({ length: height }, () => Array(width).fill(false));

    this.rooms = [];
    this.monsters = [];
    this.items = new Map(); // "x,y" -> Item
    this.chests = new Set(); // "x,y"
    this.shrines = new Set(); // "x,y"
    this.stairsPos = { x: 0, y: 0 };
    this.traps = new Set();

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

    // Лестница на следующий этаж — в последней комнате
    const lastRoom = this.rooms[this.rooms.length - 1];
    this.stairsPos = { x: lastRoom.cx, y: lastRoom.cy };
    this.tiles[lastRoom.cy][lastRoom.cx] = Tile.STAIRS;

    // Расстановка монстров, сундуков, алтарей и лута
    for (let idx = 1; idx < this.rooms.length; idx++) {
      const room = this.rooms[idx];
      // Монстры
      const count = Math.floor(Math.random() * 2) + 1;
      for (let k = 0; k < count; k++) {
        const mx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const my = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        if (mx !== this.stairsPos.x || my !== this.stairsPos.y) {
          let type = "goblin";
          if (idx === this.rooms.length - 1 && this.floor % 3 === 0) {
            type = "boss";
          } else {
            const roll = Math.random();
            if (roll > 0.7) type = "assassin";
            else if (roll > 0.4) type = "archer";
          }
          this.monsters.push(new Monster(mx, my, type, this.floor));
        }
      }

      // Сундуки (шанс 50%)
      if (Math.random() < 0.5) {
        const cx = Math.floor(Math.random() * (room.w - 2)) + room.x + 1;
        const cy = Math.floor(Math.random() * (room.h - 2)) + room.y + 1;
        this.chests.add(`${cx},${cy}`);
      }

      // Алтарь (шанс 25%)
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
    this.floor = 1;
    this.turns = 0;

    this.particles = [];
    this.damageTexts = [];

    this.initMap();
    this.bindEvents();
    this.updateHUD();

    // Запуск игрового цикла рендеринга
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.renderLoop(t));

    addCombatLog("⚔️ Вы ступили во тьму Подземелья Бездны...", "floor");
    showDungeonAlert("Используйте WASD для перемещения и атаки!");
  }

  initMap() {
    this.map = new DungeonMap(MAP_WIDTH, MAP_HEIGHT, this.floor);
    const startRoom = this.map.rooms[0];
    this.player = new Player(startRoom.cx, startRoom.cy);
    this.map.computeFOV(this.player.x, this.player.y);
  }

  nextFloor() {
    this.floor += 1;
    sfx.playLevelUp();
    showDungeonAlert(`🪜 Вы спустились на ${this.floor} этаж Бездны!`);
    addCombatLog(`🪜 Спуск в неизведанную тьму: Этаж ${this.floor}`, "floor");

    const oldScore = this.player.score;
    const oldLevel = this.player.level;
    const oldXp = this.player.xp;
    const oldHp = this.player.hp;
    const oldMp = this.player.mp;
    const oldEquip = this.player.equipped;
    const oldInv = this.player.inventory;

    this.map = new DungeonMap(MAP_WIDTH, MAP_HEIGHT, this.floor);
    const startRoom = this.map.rooms[0];
    this.player.x = startRoom.cx;
    this.player.y = startRoom.cy;
    this.player.score = oldScore + 100;
    this.player.level = oldLevel;
    this.player.xp = oldXp;
    this.player.hp = Math.min(this.player.maxHp, oldHp + 30);
    this.player.mp = oldMp;
    this.player.equipped = oldEquip;
    this.player.inventory = oldInv;

    this.map.computeFOV(this.player.x, this.player.y);
    this.updateHUD();
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
        showDungeonAlert("Нажмите [>] или кнопку «Спуск» для перехода глубже!");
      }

      this.map.computeFOV(this.player.x, this.player.y);
      this.endTurn();
    }
  }

  playerAttack(monster) {
    sfx.playHit();
    const isCrit = Math.random() < this.player.totalCrit;
    const dmg = isCrit ? this.player.totalAtk * 2 : this.player.totalAtk;

    monster.hp -= dmg;
    this.spawnDamageText(monster.x, monster.y, `-${dmg}`, isCrit ? "#f59e0b" : "#ff3366");
    this.spawnParticles(monster.x * TILE_SIZE + 18, monster.y * TILE_SIZE + 18, "#ff3366", 8);

    const critTxt = isCrit ? " [КРИТИЧЕСКИЙ УДАР!]" : "";
    addCombatLog(`🗡️ Вы нанесли ${monster.name} ${dmg} урона${critTxt}!`, "damage-monster");

    if (monster.hp <= 0) {
      monster.isAlive = false;
      this.player.gainXp(monster.xp);
      addCombatLog(`💀 ${monster.name} повержен! (+${monster.xp} XP)`, "loot");

      // Шанс лута с монстра
      if (Math.random() < 0.6) {
        const item = this.getRandomItem();
        this.player.inventory.push(item);
        addCombatLog(`✨ Вы нашли предмет: ${item.name}`, "loot");
      }
    }
  }

  openChest(x, y) {
    this.map.chests.delete(`${x},${y}`);
    sfx.playLoot();
    const item = this.getRandomItem();
    this.player.inventory.push(item);
    showDungeonAlert(`🧰 В сундуке обнаружено: ${item.name}!`);
    addCombatLog(`🧰 Вы открыли сундук и получили ${item.name}!`, "loot");
    this.spawnParticles(x * TILE_SIZE + 18, y * TILE_SIZE + 18, "#ffb834", 16);
  }

  useShrine(x, y) {
    this.map.shrines.delete(`${x},${y}`);
    sfx.playLoot();
    this.player.hp = this.player.maxHp;
    this.player.mp = this.player.maxMp;
    this.player.shield += 25;
    showDungeonAlert("✨ Алтарь Богов благословил вас! HP/MP полны, +25 щита!");
    addCombatLog("✨ Алтарь наполнил вас святой энергией!", "heal");
    this.spawnParticles(x * TILE_SIZE + 18, y * TILE_SIZE + 18, "#9d4edd", 20);
  }

  castSkill(num) {
    if (!this.player.isAlive) return;
    sfx.init();

    if (this.player.skillsCd[num] > 0) {
      showDungeonAlert("Способность ещё восстанавливается!");
      return;
    }

    if (num === 1) { // Огненный шар
      const cost = 15;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      const target = this.map.monsters.find(m => m.isAlive && this.map.visible[m.y][m.x]);
      if (!target) { showDungeonAlert("Нет видимых врагов для огненного шара!"); return; }

      this.player.mp -= cost;
      this.player.skillsCd[1] = 3;
      sfx.playSpell();
      const dmg = 35 + this.player.level * 5;
      target.hp -= dmg;
      this.spawnDamageText(target.x, target.y, `-${dmg} 🔥`, "#ff7700");
      this.spawnParticles(target.x * TILE_SIZE + 18, target.y * TILE_SIZE + 18, "#ff5500", 24);
      addCombatLog(`🔥 Огненный шар испепелил ${target.name} на ${dmg} урона!`, "damage-monster");
      if (target.hp <= 0) {
        target.isAlive = false;
        this.player.gainXp(target.xp);
      }
      this.endTurn();

    } else if (num === 2) { // Вихрь клинков
      const cost = 20;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      this.player.mp -= cost;
      this.player.skillsCd[2] = 4;
      sfx.playHit();

      let hits = 0;
      for (let m of this.map.monsters) {
        if (m.isAlive && Math.abs(m.x - this.player.x) <= 2 && Math.abs(m.y - this.player.y) <= 2) {
          const dmg = 24 + this.player.totalAtk;
          m.hp -= dmg;
          hits++;
          this.spawnDamageText(m.x, m.y, `-${dmg}`, "#38bdf8");
          if (m.hp <= 0) { m.isAlive = false; this.player.gainXp(m.xp); }
        }
      }
      this.spawnParticles(this.player.x * TILE_SIZE + 18, this.player.y * TILE_SIZE + 18, "#38bdf8", 30);
      addCombatLog(`🌪️ Вихрь клинков поразил ${hits} врагов вокруг!`, "damage-monster");
      this.endTurn();

    } else if (num === 3) { // Теневой шаг
      const cost = 12;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      const target = this.map.monsters.find(m => m.isAlive && this.map.visible[m.y][m.x]);
      if (!target) { showDungeonAlert("Нет врага для прыжка за спину!"); return; }

      this.player.mp -= cost;
      this.player.skillsCd[3] = 4;
      sfx.playSpell();
      this.player.x = target.x;
      this.player.y = target.y;
      const dmg = this.player.totalAtk * 2;
      target.hp -= dmg;
      this.spawnDamageText(target.x, target.y, `КРИТ -${dmg}`, "#a855f7");
      this.spawnParticles(target.x * TILE_SIZE + 18, target.y * TILE_SIZE + 18, "#a855f7", 20);
      addCombatLog(`👤 Теневой шаг: вы внезапно атаковали ${target.name} из тени!`, "damage-monster");
      if (target.hp <= 0) { target.isAlive = false; this.player.gainXp(target.xp); }
      this.map.computeFOV(this.player.x, this.player.y);
      this.endTurn();

    } else if (num === 4) { // Каменная кожа
      const cost = 10;
      if (this.player.mp < cost) { showDungeonAlert("Недостаточно маны!"); return; }
      this.player.mp -= cost;
      this.player.skillsCd[4] = 5;
      sfx.playSpell();
      const shieldVal = 30 + this.player.level * 8;
      this.player.shield += shieldVal;
      showDungeonAlert(`🪨 Каменная кожа (+${shieldVal} щита)!`);
      addCombatLog(`🪨 Ваша кожа покрылась прочнейшим камнем (+${shieldVal} щита)!`, "heal");
      this.spawnParticles(this.player.x * TILE_SIZE + 18, this.player.y * TILE_SIZE + 18, "#eab308", 16);
      this.endTurn();
    }
  }

  // Завершение хода: монстры и кулдауны
  endTurn() {
    this.turns += 1;

    // Регенерация маны (1 MP за ход)
    this.player.mp = Math.min(this.player.maxMp, this.player.mp + 1);

    // Уменьшение кулдаунов
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
        addCombatLog(`💥 ${m.name} ударил вас на ${dmg} урона!`, "damage-player");
      }
      // Лучник
      else if (m.type === "archer" && dist >= 2 && dist <= 5 && this.map.visible[m.y][m.x]) {
        const dmg = this.player.takeDamage(m.atk);
        sfx.playHit();
        this.spawnDamageText(this.player.x, this.player.y, `-${dmg} 🏹`, "#ff3366");
        addCombatLog(`🏹 ${m.name} выпустил стрелу в вас (${dmg} урона)!`, "damage-player");
      }
      // Перемещение к игроку
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
      const speed = Math.random() * 2 + 1;
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

    this.ctx.fillStyle = "#0c0d12";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Центрирование камеры на игроке
    const offsetX = Math.floor(this.canvas.width / 2 - (this.player.x + 0.5) * TILE_SIZE);
    const offsetY = Math.floor(this.canvas.height / 2 - (this.player.y + 0.5) * TILE_SIZE);

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);


    const t = time / 1000;
    const torchFlicker = Math.sin(t * 7) * 0.05 + Math.cos(t * 13) * 0.03;

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
          this.ctx.fillStyle = isVis ? "#1c2030" : "#10121a";
          this.ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
          this.ctx.strokeStyle = isVis ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.5)";
          this.ctx.strokeRect(rx, ry, TILE_SIZE, TILE_SIZE);
        }
        // Стена
        else if (tile === Tile.WALL) {
          this.ctx.fillStyle = isVis ? "#2b3044" : "#171a26";
          this.ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
          // Блик на верхней грани
          this.ctx.fillStyle = isVis ? "#3c435e" : "#202434";
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
            this.ctx.fillText("🪜", rx + 18, ry + 18);
          }
        }
      }
    }

    // Отрисовка монстров
    for (let m of this.map.monsters) {
      if (!m.isAlive || !this.map.visible[m.y][m.x]) continue;

      const mx = m.x * TILE_SIZE;
      const my = m.y * TILE_SIZE;

      // Иконка врага
      this.ctx.font = "22px serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(m.icon, mx + 18, my + 18);

      // Полоска здоровья монстра над головой
      const hpPct = Math.max(0, m.hp / m.maxHp);
      this.ctx.fillStyle = "rgba(0,0,0,0.7)";
      this.ctx.fillRect(mx + 4, my - 6, 28, 4);
      this.ctx.fillStyle = "#ff3366";
      this.ctx.fillRect(mx + 4, my - 6, 28 * hpPct, 4);
    }

    // Отрисовка игрока (героя)
    if (this.player.isAlive) {
      const px = this.player.x * TILE_SIZE;
      const py = this.player.y * TILE_SIZE;
      const bob = Math.sin(t * 5) * 2;

      // Свечение ауры
      const glow = this.ctx.createRadialGradient(px + 18, py + 18, 5, px + 18, py + 18, 60);
      glow.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      glow.addColorStop(1, "rgba(59, 130, 246, 0)");
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(px + 18, py + 18, 60, 0, Math.PI * 2);
      this.ctx.fill();

      // Щит (если активен)
      if (this.player.shield > 0) {
        this.ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(px + 18, py + 18 + bob, 18, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.font = "24px serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("🧙‍♂️", px + 18, py + 18 + bob);
    }

    // Частицы
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

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  // Обновление интерфейса
  updateHUD() {
    document.getElementById("floorBadge").textContent = `Этаж ${this.floor}`;
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
    document.getElementById("equipArmorName").textContent = this.player.equipped.armor?.name || "Лохмотья";
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
    document.getElementById("goFloor").textContent = this.floor;
    document.getElementById("goLevel").textContent = this.player.level;
    document.getElementById("goScore").textContent = this.player.score;
    document.getElementById("goTurns").textContent = this.turns;
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
        addCombatLog("⏳ Вы выжидаете удобного момента...", "floor");
        this.endTurn();
      } else if (["1", "2", "3", "4"].includes(key)) {
        this.castSkill(parseInt(key));
      } else if (["i", "ш"].includes(key)) {
        this.toggleInventory();
      } else if ([">", "э"].includes(key)) {
        if (this.player.x === this.map.stairsPos.x && this.player.y === this.map.stairsPos.y) {
          this.nextFloor();
        } else {
          showDungeonAlert("Здесь нет лестницы вглубь!");
        }
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
      addCombatLog("⏳ Вы выжидаете удобного момента...", "floor");
      this.endTurn();
    });

    // Быстрые кнопки
    document.getElementById("btnWait").addEventListener("click", () => {
      addCombatLog("⏳ Вы выжидаете удобного момента...", "floor");
      this.endTurn();
    });

    document.getElementById("btnStairs").addEventListener("click", () => {
      if (this.player.x === this.map.stairsPos.x && this.player.y === this.map.stairsPos.y) {
        this.nextFloor();
      } else {
        showDungeonAlert("Сначала доберитесь до лестницы (🪜)!");
      }
    });

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
  }

  restartGame() {
    this.floor = 1;
    this.turns = 0;
    this.initMap();
    this.updateHUD();
    addCombatLog("🔄 Игра начата заново. Удачи, герой!", "floor");
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
  alert.textContent = msg;
  alert.classList.add("show");
  clearTimeout(alert._timer);
  alert._timer = setTimeout(() => {
    alert.classList.remove("show");
  }, 2200);
}

function addCombatLog(msg, type = "") {
  const log = document.getElementById("combatLog");
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
