#!/usr/bin/env python3
"""
=============================================================================
DUNGEON CRAWLER: ABYSSAL CHRONICLES (ХРОНИКИ БЕЗДНЫ)
Глубокая пошаговая Roguelike-RPG на стандартной библиотеке Python.

Ключевые механики:
- Туман войны (Fog of War) и динамическое поле зрения (Field of View).
- Умный поиск пути монстров на алгоритме A* (A-Star) через коридоры и двери.
- 4 архетипа врагов с уникальным поведением: рубаки, лучники, ассасины и боссы.
- Слоты экипировки (Оружие, Доспех, Амулет, Сапоги) и редкости (Обычный, Редкий, Эпик, Легендарный).
- Система магии и способностей (Огненный шар, Вихрь, Теневой шаг, Каменная кожа).
- Интерактивные объекты: сундуки с лутом/мимики, алтари богов, ловушки, двери.
- Эффекты состояний: Отравление, Горение, Оглушение, Щит, Регенерация.
- Система сохранения/загрузки в JSON (прогресс не теряется).
- Поддержка русской и английской раскладок (WASD / ЦФЫВ, 1-4, I, C, H, Q).
=============================================================================
"""

from __future__ import annotations

import heapq
import json
import math
import os
import random
import sys
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple


# =====================================================================
# ANSI ЦВЕТА И СТИЛИ ТЕРМИНАЛА
# =====================================================================
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    ITALIC = "\033[3m"
    UNDERLINE = "\033[4m"

    # Основные цвета
    BLACK = "\033[30m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    GRAY = "\033[90m"

    # Фоновые цвета
    BG_RED = "\033[41m"
    BG_DARK = "\033[48;5;234m"

    # Редкости
    COMMON = "\033[37m"       # Белый
    RARE = "\033[94m"         # Синий
    EPIC = "\033[95m"         # Пурпурный
    LEGENDARY = "\033[93m\033[1m"  # Золотой


def clear_screen() -> None:
    """Очистка экрана кроссплатформенно."""
    os.system("cls" if os.name == "nt" else "clear")


# =====================================================================
# ПЕРЕЧИСЛЕНИЯ И ТИПЫ
# =====================================================================
class ItemType(str, Enum):
    WEAPON = "Оружие"
    ARMOR = "Доспех"
    ACCESSORY = "Амулет"
    BOOTS = "Сапоги"
    POTION = "Зелье"
    SCROLL = "Свиток"


class Rarity(str, Enum):
    COMMON = "Обычный"
    RARE = "Редкий"
    EPIC = "Эпический"
    LEGENDARY = "Легендарный"

    @property
    def color(self) -> str:
        if self == Rarity.COMMON:
            return Colors.COMMON
        elif self == Rarity.RARE:
            return Colors.RARE
        elif self == Rarity.EPIC:
            return Colors.EPIC
        elif self == Rarity.LEGENDARY:
            return Colors.LEGENDARY
        return Colors.WHITE


class EffectType(str, Enum):
    POISON = "Яд"
    BURN = "Горение"
    STUN = "Оглушение"
    SHIELD = "Щит"
    REGEN = "Регенерация"


class TileType(str, Enum):
    WALL = "#"
    FLOOR = "."
    DOOR_CLOSED = "+"
    DOOR_OPEN = "/"
    STAIRS_DOWN = ">"
    TRAP_HIDDEN = "."
    TRAP_REVEALED = "^"
    CHEST = "C"
    CHEST_OPEN = "_"
    SHRINE = "&"


# =====================================================================
# СТРУКТУРЫ ДАННЫХ: ЭФФЕКТЫ, ПРЕДМЕТЫ, СПОСОБНОСТИ
# =====================================================================
@dataclass
class StatusEffect:
    effect_type: EffectType
    duration: int
    power: int
    name: str

    def tick(self, entity: "Entity", log_cb) -> bool:
        """Применяет эффект за 1 ход. Возвращает False если эффект спал."""
        if self.effect_type == EffectType.POISON:
            dmg = entity.take_pure_damage(self.power)
            log_cb(f"{entity.name} страдает от яда на {Colors.GREEN}{dmg} урона{Colors.RESET}!")
        elif self.effect_type == EffectType.BURN:
            dmg = entity.take_pure_damage(self.power)
            log_cb(f"{entity.name} горит в огне на {Colors.RED}{dmg} урона{Colors.RESET}!")
        elif self.effect_type == EffectType.REGEN:
            healed = entity.heal(self.power)
            if healed > 0:
                log_cb(f"{entity.name} регенерирует {Colors.GREEN}+{healed} HP{Colors.RESET}.")

        self.duration -= 1
        return self.duration > 0


@dataclass
class Item:
    name: str
    item_type: ItemType
    rarity: Rarity
    atk_bonus: int = 0
    def_bonus: int = 0
    hp_bonus: int = 0
    mp_bonus: int = 0
    value: int = 0
    symbol: str = "!"
    effect: Optional[str] = None

    @property
    def display_name(self) -> str:
        return f"{self.rarity.color}{self.name}{Colors.RESET}"

    def get_stats_description(self) -> str:
        parts = []
        if self.atk_bonus:
            parts.append(f"Атк +{self.atk_bonus}")
        if self.def_bonus:
            parts.append(f"Защ +{self.def_bonus}")
        if self.hp_bonus:
            parts.append(f"HP +{self.hp_bonus}")
        if self.mp_bonus:
            parts.append(f"MP +{self.mp_bonus}")
        if self.value and self.item_type == ItemType.POTION:
            parts.append(f"Восст. {self.value}")
        return ", ".join(parts) if parts else "Особый предмет"


@dataclass
class Skill:
    id_num: int
    name: str
    mana_cost: int
    cooldown: int
    current_cd: int = 0
    description: str = ""

    @property
    def is_ready(self) -> bool:
        return self.current_cd <= 0


# =====================================================================
# СУЩНОСТИ (СУПЕРКЛАСС ENTITY, МОНСТРЫ, ИГРОК)
# =====================================================================
@dataclass
class Entity:
    x: int
    y: int
    name: str
    symbol: str
    color: str
    hp: int
    max_hp: int
    base_attack: int
    base_defense: int
    status_effects: List[StatusEffect] = field(default_factory=list)
    shield_hp: int = 0

    @property
    def is_alive(self) -> bool:
        return self.hp > 0

    @property
    def is_stunned(self) -> bool:
        return any(e.effect_type == EffectType.STUN and e.duration > 0 for e in self.status_effects)

    @property
    def total_attack(self) -> int:
        return self.base_attack

    @property
    def total_defense(self) -> int:
        return self.base_defense

    def take_damage(self, amount: int) -> int:
        """Расчёт урона с учётом защиты и временных щитов."""
        reduced = max(1, amount - self.total_defense)
        if self.shield_hp > 0:
            absorbed = min(self.shield_hp, reduced)
            self.shield_hp -= absorbed
            reduced -= absorbed
            if reduced <= 0:
                return 0
        self.hp = max(0, self.hp - reduced)
        return reduced

    def take_pure_damage(self, amount: int) -> int:
        """Чистый урон в обход защиты (яд, огонь)."""
        actual = min(self.hp, amount)
        self.hp = max(0, self.hp - actual)
        return actual

    def heal(self, amount: int) -> int:
        real = min(amount, self.max_hp - self.hp)
        self.hp += real
        return real

    def add_effect(self, effect: StatusEffect, log_cb) -> None:
        # Продлеваем существующий эффект или добавляем новый
        for existing in self.status_effects:
            if existing.effect_type == effect.effect_type:
                existing.duration = max(existing.duration, effect.duration)
                existing.power = max(existing.power, effect.power)
                log_cb(f"Эффект {effect.name} на {self.name} продлён!")
                return
        self.status_effects.append(effect)
        log_cb(f"На {self.name} наложен эффект: {effect.name} ({effect.duration} ходов)!")


class MonsterAI(str, Enum):
    MELEE = "Рукопашный"
    ARCHER = "Стрелок"
    ASSASSIN = "Ассасин"
    BOSS = "Босс"


@dataclass
class Monster(Entity):
    ai_type: MonsterAI = MonsterAI.MELEE
    xp_reward: int = 20
    alerted: bool = False
    special_cd: int = 0


class Player(Entity):
    def __init__(self, x: int, y: int):
        super().__init__(
            x=x,
            y=y,
            name="Герой",
            symbol="@",
            color=Colors.GREEN + Colors.BOLD,
            hp=120,
            max_hp=120,
            base_attack=15,
            base_defense=4,
        )
        self.mp = 50
        self.max_mp = 50
        self.level = 1
        self.xp = 0
        self.xp_to_next_level = 60
        self.gold = 0
        self.score = 0
        self.crit_chance = 0.12
        self.dodge_chance = 0.08

        # Слоты экипировки
        self.equipped_weapon: Optional[Item] = Item("Старый клинок", ItemType.WEAPON, Rarity.COMMON, atk_bonus=5, symbol="/")
        self.equipped_armor: Optional[Item] = Item("Кожаный дублет", ItemType.ARMOR, Rarity.COMMON, def_bonus=3, symbol="[")
        self.equipped_accessory: Optional[Item] = None
        self.equipped_boots: Optional[Item] = None

        # Инвентарь (до 18 предметов)
        self.inventory: List[Item] = [
            Item("Большое зелье здоровья", ItemType.POTION, Rarity.COMMON, value=50, symbol="!"),
            Item("Флакон чистой маны", ItemType.POTION, Rarity.COMMON, mp_bonus=40, value=40, symbol="!"),
            Item("Свиток очищения", ItemType.SCROLL, Rarity.RARE, value=0, symbol="?", effect="cure"),
        ]

        # Заклинания и способности
        self.skills: List[Skill] = [
            Skill(1, "Огненный шар", mana_cost=15, cooldown=4, description="Бьёт по цели и области 3x3 нанося огненный урон и поджигая врагов"),
            Skill(2, "Вихрь клинков", mana_cost=18, cooldown=5, description="Атакует всех врагов в радиусе 1 клетки с повышенным уроном"),
            Skill(3, "Теневой шаг", mana_cost=12, cooldown=6, description="Мгновенный телепорт на 3-4 клетки вперед сквозь врагов"),
            Skill(4, "Каменная кожа", mana_cost=20, cooldown=8, description="Накладывает щит прочностью 45 HP на 6 ходов"),
        ]

    @property
    def total_attack(self) -> int:
        bonus = sum([
            item.atk_bonus for item in (
                self.equipped_weapon, self.equipped_armor,
                self.equipped_accessory, self.equipped_boots
            ) if item is not None
        ])
        return self.base_attack + bonus

    @property
    def total_defense(self) -> int:
        bonus = sum([
            item.def_bonus for item in (
                self.equipped_weapon, self.equipped_armor,
                self.equipped_accessory, self.equipped_boots
            ) if item is not None
        ])
        return self.base_defense + bonus

    def add_xp(self, amount: int, log_cb) -> None:
        self.xp += amount
        self.score += amount * 2
        log_cb(f"Получено {Colors.CYAN}+{amount} XP{Colors.RESET}.")
        while self.xp >= self.xp_to_next_level:
            self.xp -= self.xp_to_next_level
            self.level += 1
            self.xp_to_next_level = int(self.xp_to_next_level * 1.55)
            self.max_hp += 25
            self.hp = self.max_hp
            self.max_mp += 15
            self.mp = self.max_mp
            self.base_attack += 4
            self.base_defense += 2
            self.crit_chance = min(0.40, self.crit_chance + 0.02)
            self.dodge_chance = min(0.30, self.dodge_chance + 0.015)
            log_cb(
                f"{Colors.YELLOW}{Colors.BOLD}★ НОВЫЙ УРОВЕНЬ! "
                f"Вы достигли {self.level} уровня! Все характеристики возросли! ★{Colors.RESET}"
            )

    def restore_mp(self, amount: int) -> int:
        real = min(amount, self.max_mp - self.mp)
        self.mp += real
        return real

    def equip_item(self, item: Item) -> Optional[Item]:
        """Экипирует предмет в соответствующий слот и возвращает старый предмет в инвентарь."""
        old_item = None
        if item.item_type == ItemType.WEAPON:
            old_item = self.equipped_weapon
            self.equipped_weapon = item
        elif item.item_type == ItemType.ARMOR:
            old_item = self.equipped_armor
            self.equipped_armor = item
        elif item.item_type == ItemType.ACCESSORY:
            old_item = self.equipped_accessory
            self.equipped_accessory = item
        elif item.item_type == ItemType.BOOTS:
            old_item = self.equipped_boots
            self.equipped_boots = item
        return old_item


# =====================================================================
# ГЕНЕРАЦИЯ ПРЕДМЕТОВ И МОНСТРОВ
# =====================================================================
class ContentGenerator:
    WEAPON_NAMES = [
        ("Ржавый топор", 6), ("Стальной палаш", 11), ("Эльфийский рапира", 16),
        ("Молот Громовержца", 22), ("Клинок Вечной Тьмы", 30), ("Пепельный Пожинатель", 40)
    ]
    ARMOR_NAMES = [
        ("Кольчужная рубаха", 5), ("Латный панцирь", 9), ("Доспех Драконьей Чешуи", 15),
        ("Эгида Хранителя", 22), ("Броня Повелителя Бездны", 32)
    ]
    ACCESSORY_NAMES = [
        ("Амулет Жизни", 0, 0, 30, 10), ("Кольцо Силы", 6, 2, 0, 0),
        ("Талисман Архимага", 2, 2, 15, 35), ("Око Хаоса", 10, 5, 20, 20)
    ]
    BOOTS_NAMES = [
        ("Поножи следопыта", 2, 3), ("Сапоги ветра", 4, 6),
        ("Башмаки титана", 5, 12)
    ]

    @staticmethod
    def generate_random_item(floor: int) -> Item:
        roll = random.random()
        rarity_roll = random.random() + (floor * 0.05)
        if rarity_roll > 1.2:
            rarity = Rarity.LEGENDARY
            stat_mult = 2.0
        elif rarity_roll > 0.85:
            rarity = Rarity.EPIC
            stat_mult = 1.5
        elif rarity_roll > 0.5:
            rarity = Rarity.RARE
            stat_mult = 1.2
        else:
            rarity = Rarity.COMMON
            stat_mult = 1.0

        if roll < 0.35:
            # Зелья
            potion_type = random.choice(["hp", "mp", "full"])
            if potion_type == "hp":
                val = int((40 + floor * 15) * stat_mult)
                return Item(f"Зелье исцеления (+{val} HP)", ItemType.POTION, rarity, value=val, symbol="!")
            elif potion_type == "mp":
                val = int((30 + floor * 12) * stat_mult)
                return Item(f"Зелье маны (+{val} MP)", ItemType.POTION, rarity, mp_bonus=val, value=val, symbol="!")
            else:
                return Item(f"Эликсир Очищения", ItemType.SCROLL, Rarity.RARE, symbol="?", effect="cure")

        elif roll < 0.60:
            # Оружие
            idx = min(len(ContentGenerator.WEAPON_NAMES) - 1, random.randint(0, floor // 2 + 1))
            name, base_atk = ContentGenerator.WEAPON_NAMES[idx]
            final_atk = int(base_atk * stat_mult)
            return Item(name, ItemType.WEAPON, rarity, atk_bonus=final_atk, symbol="/")

        elif roll < 0.80:
            # Доспех
            idx = min(len(ContentGenerator.ARMOR_NAMES) - 1, random.randint(0, floor // 2))
            name, base_def = ContentGenerator.ARMOR_NAMES[idx]
            final_def = int(base_def * stat_mult)
            return Item(name, ItemType.ARMOR, rarity, def_bonus=final_def, symbol="[")

        elif roll < 0.90:
            # Амулет
            idx = min(len(ContentGenerator.ACCESSORY_NAMES) - 1, random.randint(0, len(ContentGenerator.ACCESSORY_NAMES) - 1))
            name, atk, df, hp, mp = ContentGenerator.ACCESSORY_NAMES[idx]
            return Item(name, ItemType.ACCESSORY, rarity, atk_bonus=int(atk * stat_mult), def_bonus=int(df * stat_mult), hp_bonus=int(hp * stat_mult), mp_bonus=int(mp * stat_mult), symbol="*")

        else:
            # Сапоги
            idx = min(len(ContentGenerator.BOOTS_NAMES) - 1, random.randint(0, len(ContentGenerator.BOOTS_NAMES) - 1))
            name, atk, df = ContentGenerator.BOOTS_NAMES[idx]
            return Item(name, ItemType.BOOTS, rarity, atk_bonus=int(atk * stat_mult), def_bonus=int(df * stat_mult), symbol="b")

    @staticmethod
    def generate_monster(x: int, y: int, floor: int) -> Monster:
        # Базовые архетипы
        archetypes = [
            ("Пещерный гоблин", "g", Colors.GREEN, 32, 9, 2, MonsterAI.MELEE, 25),
            ("Чумной скелет", "s", Colors.WHITE, 45, 13, 4, MonsterAI.MELEE, 35),
            ("Тёмный лучник", "a", Colors.YELLOW, 38, 15, 3, MonsterAI.ARCHER, 45),
            ("Теневой ассасин", "t", Colors.MAGENTA, 42, 19, 4, MonsterAI.ASSASSIN, 60),
            ("Орк-берсерк", "O", Colors.RED, 70, 22, 6, MonsterAI.MELEE, 80),
        ]
        max_idx = min(len(archetypes) - 1, 1 + floor // 2)
        name, sym, col, hp, atk, df, ai, xp = archetypes[random.randint(0, max_idx)]

        scale = 1.0 + (floor - 1) * 0.28
        return Monster(
            x=x,
            y=y,
            name=name,
            symbol=sym,
            color=col,
            hp=int(hp * scale),
            max_hp=int(hp * scale),
            base_attack=int(atk * scale),
            base_defense=int(df * scale),
            ai_type=ai,
            xp_reward=int(xp * scale),
        )

    @staticmethod
    def generate_boss(x: int, y: int, floor: int) -> Monster:
        boss_names = [
            ("Малакор, Повелитель Мёртвых", "M", Colors.BG_RED + Colors.WHITE + Colors.BOLD, 220, 28, 10, 250),
            ("Азгарот, Демон Пылающей Бездны", "A", Colors.BG_RED + Colors.YELLOW + Colors.BOLD, 380, 42, 16, 500),
            ("Кронос, Древний Титан Забвения", "K", Colors.BG_RED + Colors.CYAN + Colors.BOLD, 650, 58, 22, 1000),
        ]
        idx = min(len(boss_names) - 1, (floor // 3) - 1)
        name, sym, col, hp, atk, df, xp = boss_names[max(0, idx)]
        scale = 1.0 + (floor - 1) * 0.25
        return Monster(
            x=x,
            y=y,
            name=f"[БОСС] {name}",
            symbol=sym,
            color=col,
            hp=int(hp * scale),
            max_hp=int(hp * scale),
            base_attack=int(atk * scale),
            base_defense=int(df * scale),
            ai_type=MonsterAI.BOSS,
            xp_reward=int(xp * scale),
        )


# =====================================================================
# КАРТА И АЛГОРИТМЫ (ПОИСК ПУТИ A* И ТУМАН ВОЙНЫ FOV)
# =====================================================================
class Room:
    def __init__(self, x: int, y: int, w: int, h: int):
        self.x1 = x
        self.y1 = y
        self.x2 = x + w
        self.y2 = y + h

    @property
    def center(self) -> Tuple[int, int]:
        return ((self.x1 + self.x2) // 2, (self.y1 + self.y2) // 2)

    def intersects(self, other: "Room", padding: int = 1) -> bool:
        return (
            self.x1 - padding <= other.x2
            and self.x2 + padding >= other.x1
            and self.y1 - padding <= other.y2
            and self.y2 + padding >= other.y1
        )


class DungeonMap:
    def __init__(self, width: int = 56, height: int = 22, floor: int = 1):
        self.width = width
        self.height = height
        self.floor = floor
        self.tiles = [[TileType.WALL for _ in range(width)] for _ in range(height)]
        self.explored = [[False for _ in range(width)] for _ in range(height)]
        self.visible = [[False for _ in range(width)] for _ in range(height)]

        self.rooms: List[Room] = []
        self.monsters: List[Monster] = []
        self.items: Dict[Tuple[int, int], Item] = {}
        self.stairs_pos: Tuple[int, int] = (0, 0)
        self.traps: Dict[Tuple[int, int], str] = {}  # "poison" or "spike"
        self.chests: Dict[Tuple[int, int], Item] = {}
        self.shrines: Set[Tuple[int, int]] = set()

        self._generate()

    def _create_h_tunnel(self, x1: int, x2: int, y: int) -> None:
        for x in range(min(x1, x2), max(x1, x2) + 1):
            if 0 < x < self.width - 1 and 0 < y < self.height - 1:
                self.tiles[y][x] = TileType.FLOOR

    def _create_v_tunnel(self, y1: int, y2: int, x: int) -> None:
        for y in range(min(y1, y2), max(y1, y2) + 1):
            if 0 < x < self.width - 1 and 0 < y < self.height - 1:
                self.tiles[y][x] = TileType.FLOOR

    def _generate(self) -> None:
        max_rooms = 9
        min_size = 5
        max_size = 11

        for _ in range(80):
            if len(self.rooms) >= max_rooms:
                break
            w = random.randint(min_size, max_size)
            h = random.randint(min_size, max_size)
            x = random.randint(1, self.width - w - 2)
            y = random.randint(1, self.height - h - 2)

            new_room = Room(x, y, w, h)
            if any(new_room.intersects(r) for r in self.rooms):
                continue

            for ry in range(new_room.y1, new_room.y2):
                for rx in range(new_room.x1, new_room.x2):
                    self.tiles[ry][rx] = TileType.FLOOR

            if self.rooms:
                px, py = self.rooms[-1].center
                nx, ny = new_room.center
                if random.random() < 0.5:
                    self._create_h_tunnel(px, nx, py)
                    self._create_v_tunnel(py, ny, nx)
                else:
                    self._create_v_tunnel(py, ny, px)
                    self._create_h_tunnel(px, nx, ny)

            self.rooms.append(new_room)

        # Добавление дверей на входах в комнаты
        for room in self.rooms:
            for rx in range(room.x1, room.x2):
                for ry in (room.y1 - 1, room.y2):
                    if 0 < ry < self.height and self.tiles[ry][rx] == TileType.FLOOR and random.random() < 0.4:
                        self.tiles[ry][rx] = TileType.DOOR_CLOSED
            for ry in range(room.y1, room.y2):
                for rx in (room.x1 - 1, room.x2):
                    if 0 < rx < self.width and self.tiles[ry][rx] == TileType.FLOOR and random.random() < 0.4:
                        self.tiles[ry][rx] = TileType.DOOR_CLOSED

        # Проверка босс-этажа (каждые 3 этажа)
        is_boss_floor = (self.floor % 3 == 0)

        # Спавн существ и интерактивных объектов
        for idx, room in enumerate(self.rooms[1:], start=1):
            # Монстры
            monster_count = random.randint(1, 2 + self.floor // 2)
            for _ in range(monster_count):
                mx = random.randint(room.x1, room.x2 - 1)
                my = random.randint(room.y1, room.y2 - 1)
                if not any(m.x == mx and m.y == my for m in self.monsters):
                    self.monsters.append(ContentGenerator.generate_monster(mx, my, self.floor))

            # Ловушки (скрытые шипы или ядовитые плиты)
            if random.random() < 0.35:
                tx = random.randint(room.x1, room.x2 - 1)
                ty = random.randint(room.y1, room.y2 - 1)
                self.traps[(tx, ty)] = random.choice(["spike", "poison"])

            # Предметы или сундуки
            if random.random() < 0.55:
                ix = random.randint(room.x1, room.x2 - 1)
                iy = random.randint(room.y1, room.y2 - 1)
                if random.random() < 0.35:
                    self.tiles[iy][ix] = TileType.CHEST
                    self.chests[(ix, iy)] = ContentGenerator.generate_random_item(self.floor)
                else:
                    self.items[(ix, iy)] = ContentGenerator.generate_random_item(self.floor)

            # Алтарь (Shrine) на удачу
            if random.random() < 0.20 and not self.shrines:
                sx = random.randint(room.x1, room.x2 - 1)
                sy = random.randint(room.y1, room.y2 - 1)
                self.tiles[sy][sx] = TileType.SHRINE
                self.shrines.add((sx, sy))

        # Лестница вниз в самой дальней комнате
        last_room = self.rooms[-1]
        self.stairs_pos = last_room.center
        self.tiles[self.stairs_pos[1]][self.stairs_pos[0]] = TileType.STAIRS_DOWN

        # Спавн босса в последней комнате
        if is_boss_floor:
            bx, by = last_room.center
            self.monsters.append(ContentGenerator.generate_boss(bx, by, self.floor))

    def is_in_bounds(self, x: int, y: int) -> bool:
        return 0 <= x < self.width and 0 <= y < self.height

    def is_transparent(self, x: int, y: int) -> bool:
        """Прозрачность тайла для линии взгляда."""
        if not self.is_in_bounds(x, y):
            return False
        tile = self.tiles[y][x]
        return tile not in (TileType.WALL, TileType.DOOR_CLOSED)

    def is_walkable(self, x: int, y: int, ignore_doors: bool = False) -> bool:
        """Проходимость для перемещения."""
        if not self.is_in_bounds(x, y):
            return False
        tile = self.tiles[y][x]
        if tile == TileType.WALL:
            return False
        if tile == TileType.DOOR_CLOSED and not ignore_doors:
            return False
        return True

    def compute_fov(self, origin_x: int, origin_y: int, radius: int = 8) -> None:
        """Динамический расчёт поля зрения (Field of View) методом лучей."""
        # Сброс видимости
        for y in range(self.height):
            for x in range(self.width):
                self.visible[y][x] = False

        self.visible[origin_y][origin_x] = True
        self.explored[origin_y][origin_x] = True

        for angle_deg in range(0, 360, 2):
            rad = math.radians(angle_deg)
            dx = math.cos(rad)
            dy = math.sin(rad)

            cx = float(origin_x) + 0.5
            cy = float(origin_y) + 0.5

            for _ in range(radius * 2):
                cx += dx * 0.5
                cy += dy * 0.5
                ix = int(cx)
                iy = int(cy)

                if not self.is_in_bounds(ix, iy):
                    break

                self.visible[iy][ix] = True
                self.explored[iy][ix] = True

                if not self.is_transparent(ix, iy):
                    break

    def find_path_astar(self, start: Tuple[int, int], goal: Tuple[int, int]) -> List[Tuple[int, int]]:
        """Алгоритм A* (A-Star) для нахождения оптимального пути противников."""
        if start == goal:
            return []

        def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> int:
            return abs(a[0] - b[0]) + abs(a[1] - b[1])

        open_set: List[Tuple[int, int, Tuple[int, int]]] = []
        heapq.heappush(open_set, (0, 0, start))
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        cost_so_far: Dict[Tuple[int, int], int] = {start: 0}

        counter = 0
        while open_set:
            _, _, current = heapq.heappop(open_set)

            if current == goal:
                break

            for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                neighbor = (current[0] + dx, current[1] + dy)
                if not self.is_in_bounds(neighbor[0], neighbor[1]):
                    continue

                # Монстры не могут ходить сквозь стены
                if self.tiles[neighbor[1]][neighbor[0]] == TileType.WALL:
                    continue

                # Монстры могут открывать закрытые двери (стоимость чуть выше)
                move_cost = 1
                if self.tiles[neighbor[1]][neighbor[0]] == TileType.DOOR_CLOSED:
                    move_cost = 2

                new_cost = cost_so_far[current] + move_cost
                if neighbor not in cost_so_far or new_cost < cost_so_far[neighbor]:
                    cost_so_far[neighbor] = new_cost
                    priority = new_cost + heuristic(neighbor, goal)
                    counter += 1
                    heapq.heappush(open_set, (priority, counter, neighbor))
                    came_from[neighbor] = current

        if goal not in came_from:
            return []

        # Восстановление пути
        curr = goal
        path = []
        while curr != start:
            path.append(curr)
            curr = came_from[curr]
        path.reverse()
        return path


# =====================================================================
# ИГРОВОЙ ДВИЖОК: БОЙ, МАГИЯ, ХОДЫ, РЕНДЕРИНГ, МЕНЮ, СОХРАНЕНИЯ
# =====================================================================
class GameEngine:
    SAVE_FILE = "dungeon_save.json"

    def __init__(self):
        self.floor = 1
        self.map = DungeonMap(width=56, height=20, floor=self.floor)
        start_x, start_y = self.map.rooms[0].center
        self.player = Player(start_x, start_y)
        self.messages: List[str] = [
            f"{Colors.YELLOW}{Colors.BOLD}ДОБРО ПОЖАЛОВАТЬ В ХРОНИКИ БЕЗДНЫ!{Colors.RESET}",
            f"{Colors.CYAN}Управление: W/A/S/D — движение/атака, 1-4 — магия, I — инвентарь, H — помощь.{Colors.RESET}",
        ]
        self.turns_count = 0
        self.map.compute_fov(self.player.x, self.player.y, radius=8)

    def log(self, text: str) -> None:
        self.messages.append(text)
        if len(self.messages) > 6:
            self.messages.pop(0)

    def next_floor(self) -> None:
        self.floor += 1
        self.player.score += self.floor * 100
        self.log(f"{Colors.CYAN}{Colors.BOLD}Вы ступили на {self.floor} этаж Бездны! Тьма сгущается...{Colors.RESET}")
        self.map = DungeonMap(width=56, height=20, floor=self.floor)
        self.player.x, self.player.y = self.map.rooms[0].center
        self.map.compute_fov(self.player.x, self.player.y, radius=8)

    def render(self) -> None:
        clear_screen()
        # Статусная полоска HP и MP
        hp_len = 16
        filled_hp = int((self.player.hp / self.player.max_hp) * hp_len)
        hp_bar = f"{Colors.GREEN}{'█' * filled_hp}{Colors.RED}{'░' * (hp_len - filled_hp)}{Colors.RESET}"

        mp_len = 12
        filled_mp = int((self.player.mp / self.player.max_mp) * mp_len)
        mp_bar = f"{Colors.CYAN}{'█' * filled_mp}{Colors.BLUE}{'░' * (mp_len - filled_mp)}{Colors.RESET}"

        shield_str = f" {Colors.YELLOW}[Щит: {self.player.shield_hp}]{Colors.RESET}" if self.player.shield_hp > 0 else ""

        print("━" * 68)
        print(
            f" {Colors.BOLD}ЭТАЖ {self.floor}{Colors.RESET} | "
            f"HP: [{hp_bar}] {self.player.hp}/{self.player.max_hp}{shield_str} | "
            f"MP: [{mp_bar}] {self.player.mp}/{self.player.max_mp} | "
            f"LVL: {self.player.level} (XP: {self.player.xp}/{self.player.xp_to_next_level})"
        )

        wep_name = self.player.equipped_weapon.display_name if self.player.equipped_weapon else "Кулаки"
        arm_name = self.player.equipped_armor.display_name if self.player.equipped_armor else "Лохмотья"
        acc_name = self.player.equipped_accessory.display_name if self.player.equipped_accessory else "Нет"

        print(
            f" Атака: {Colors.RED}{self.player.total_attack}{Colors.RESET} | "
            f"Защита: {Colors.BLUE}{self.player.total_defense}{Colors.RESET} | "
            f"Крит: {int(self.player.crit_chance*100)}% | Уворот: {int(self.player.dodge_chance*100)}% | "
            f"Очки: {Colors.YELLOW}{self.player.score}{Colors.RESET}"
        )
        print(f" Экипировка: {wep_name} | {arm_name} | {acc_name}")
        print("━" * 68)

        # Отрисовка карты с учётом поля зрения (FOV)
        monster_map = {(m.x, m.y): m for m in self.map.monsters if m.is_alive}

        for y in range(self.map.height):
            line = []
            for x in range(self.map.width):
                is_vis = self.map.visible[y][x]
                is_exp = self.map.explored[y][x]

                if not is_exp:
                    line.append(" ")
                    continue

                if is_vis:
                    if x == self.player.x and y == self.player.y:
                        line.append(self.player.color + self.player.symbol + Colors.RESET)
                    elif (x, y) in monster_map:
                        m = monster_map[(x, y)]
                        line.append(m.color + m.symbol + Colors.RESET)
                    elif (x, y) in self.map.items:
                        it = self.map.items[(x, y)]
                        line.append(it.rarity.color + it.symbol + Colors.RESET)
                    elif (x, y) in self.map.chests:
                        line.append(f"{Colors.YELLOW}C{Colors.RESET}")
                    elif (x, y) in self.map.shrines:
                        line.append(f"{Colors.MAGENTA}&{Colors.RESET}")
                    elif (x, y) == self.map.stairs_pos:
                        line.append(f"{Colors.CYAN}{Colors.BOLD}>{Colors.RESET}")
                    elif (x, y) in self.map.traps and self.map.tiles[y][x] == TileType.TRAP_REVEALED:
                        line.append(f"{Colors.RED}^{Colors.RESET}")
                    else:
                        tile = self.map.tiles[y][x]
                        if tile == TileType.WALL:
                            line.append(f"{Colors.WHITE}#{Colors.RESET}")
                        elif tile == TileType.DOOR_CLOSED:
                            line.append(f"{Colors.YELLOW}+{Colors.RESET}")
                        elif tile == TileType.DOOR_OPEN:
                            line.append(f"{Colors.GRAY}/{Colors.RESET}")
                        else:
                            line.append(f"{Colors.DIM}.{Colors.RESET}")
                else:
                    # Исследованный, но сейчас невидимый тайл (память героя)
                    tile = self.map.tiles[y][x]
                    if (x, y) == self.map.stairs_pos:
                        line.append(f"{Colors.GRAY}>{Colors.RESET}")
                    elif tile == TileType.WALL:
                        line.append(f"{Colors.GRAY}#{Colors.RESET}")
                    elif tile == TileType.DOOR_CLOSED:
                        line.append(f"{Colors.GRAY}+{Colors.RESET}")
                    elif tile == TileType.DOOR_OPEN:
                        line.append(f"{Colors.GRAY}/{Colors.RESET}")
                    else:
                        line.append(f"{Colors.GRAY}·{Colors.RESET}")

            print("  " + "".join(line))

        print("━" * 68)

        # Панель заклинаний
        skills_view = []
        for s in self.player.skills:
            status = f"{Colors.GREEN}Готово{Colors.RESET}" if s.is_ready else f"{Colors.GRAY}{s.current_cd} х.{Colors.RESET}"
            skills_view.append(f"[{s.id_num}] {s.name} ({s.mana_cost} MP): {status}")
        print(" " + " | ".join(skills_view[:2]))
        print(" " + " | ".join(skills_view[2:]))

        print("━" * 68)
        print(f"{Colors.BOLD}Журнал событий:{Colors.RESET}")
        for msg in self.messages[-5:]:
            print(f"  • {msg}")
        print("━" * 68)
        print(f"Команда ({Colors.GREEN}WASD{Colors.RESET} - шаг/атака, {Colors.YELLOW}1-4{Colors.RESET} - магия, {Colors.CYAN}I{Colors.RESET} - инв, {Colors.BLUE}C{Colors.RESET} - инфо, {Colors.RED}Q{Colors.RESET} - выход): ", end="", flush=True)

    def handle_player_move(self, dx: int, dy: int) -> bool:
        new_x = self.player.x + dx
        new_y = self.player.y + dy

        if not self.map.is_in_bounds(new_x, new_y):
            return False

        tile = self.map.tiles[new_y][new_x]

        # Открытие закрытых дверей
        if tile == TileType.DOOR_CLOSED:
            self.map.tiles[new_y][new_x] = TileType.DOOR_OPEN
            self.log(f"{Colors.YELLOW}Вы открыли дубовую дверь.{Colors.RESET}")
            self.map.compute_fov(self.player.x, self.player.y)
            return True

        if tile == TileType.WALL:
            self.log(f"{Colors.GRAY}Путь преграждает холодная стена подземелья.{Colors.RESET}")
            return False

        # Атака противника
        target_monster = next((m for m in self.map.monsters if m.x == new_x and m.y == new_y and m.is_alive), None)
        if target_monster:
            self.perform_melee_attack(self.player, target_monster)
            return True

        # Открытие сундука
        if (new_x, new_y) in self.map.chests:
            chest_item = self.map.chests.pop((new_x, new_y))
            self.map.tiles[new_y][new_x] = TileType.CHEST_OPEN
            # Шанс на мимика!
            if random.random() < 0.20:
                self.log(f"{Colors.RED}{Colors.BOLD}СУНДУК ОКАЗАЛСЯ МИМИКОМ!{Colors.RESET}")
                mimic = Monster(
                    x=new_x, y=new_y, name="Мимик", symbol="M", color=Colors.RED,
                    hp=60 + self.floor * 15, max_hp=60 + self.floor * 15,
                    base_attack=18 + self.floor * 3, base_defense=6, xp_reward=80
                )
                self.map.monsters.append(mimic)
            else:
                self.player.inventory.append(chest_item)
                self.log(f"Вы открыли сундук и нашли {chest_item.display_name}!")
            return True

        # Использование алтаря
        if (new_x, new_y) in self.map.shrines:
            self.map.shrines.remove((new_x, new_y))
            self.map.tiles[new_y][new_x] = TileType.FLOOR
            self.trigger_shrine()
            return True

        # Обычное перемещение
        self.player.x = new_x
        self.player.y = new_y

        # Проверка ловушек
        if (new_x, new_y) in self.map.traps:
            trap_type = self.map.traps.pop((new_x, new_y))
            self.map.tiles[new_y][new_x] = TileType.TRAP_REVEALED
            if trap_type == "spike":
                dmg = self.player.take_pure_damage(random.randint(15, 25))
                self.log(f"{Colors.RED}ВЫ НАСТУПИЛИ НА ШИПЫ! Получено {dmg} чистого урона!{Colors.RESET}")
            elif trap_type == "poison":
                self.player.add_effect(StatusEffect(EffectType.POISON, 4, 6, "Яд ловушки"), self.log)
                self.log(f"{Colors.GREEN}ВЫ АКТИВИРОВАЛИ ЯДОВИТУЮ ПЛИТУ!{Colors.RESET}")

        # Подбор предметов
        if (new_x, new_y) in self.map.items:
            item = self.map.items.pop((new_x, new_y))
            if len(self.player.inventory) < 18:
                self.player.inventory.append(item)
                self.log(f"Вы подобрали {item.display_name}!")
            else:
                self.map.items[(new_x, new_y)] = item
                self.log(f"{Colors.YELLOW}Инвентарь полон! Освободите место.{Colors.RESET}")

        # Обновление FOV
        self.map.compute_fov(self.player.x, self.player.y)
        return True

    def perform_melee_attack(self, attacker: Entity, defender: Entity) -> None:
        """Расчёт рукопашного боя с учётом критов и уклонения."""
        # Проверка уклонения
        dodge = getattr(defender, "dodge_chance", 0.05)
        if random.random() < dodge:
            self.log(f"{defender.name} ловко {Colors.CYAN}уклонился{Colors.RESET} от удара {attacker.name}!")
            return

        # Проверка крита
        crit = getattr(attacker, "crit_chance", 0.10)
        is_crit = random.random() < crit
        damage = attacker.total_attack
        if is_crit:
            damage = int(damage * 1.75)
            self.log(f"{Colors.YELLOW}{Colors.BOLD}КРИТИЧЕСКИЙ УДАР!{Colors.RESET}")

        dealt = defender.take_damage(damage)
        self.log(f"{attacker.name} наносит {defender.name} {Colors.RED}{dealt} урона{Colors.RESET}!")

        # Если защитник погиб
        if not defender.is_alive:
            self.log(f"{Colors.GREEN}{defender.name} повержен!{Colors.RESET}")
            if isinstance(defender, Monster) and isinstance(attacker, Player):
                attacker.add_xp(defender.xp_reward, self.log)
                # Шанс выпадения золота или лута с монстра
                if random.random() < 0.40:
                    loot = ContentGenerator.generate_random_item(self.floor)
                    self.map.items[(defender.x, defender.y)] = loot
                    self.log(f"С поверженного врага выпал предмет: {loot.display_name}!")

    def trigger_shrine(self) -> None:
        """Случайное благословение таинственного алтаря."""
        roll = random.random()
        if roll < 0.4:
            self.player.heal(999)
            self.player.restore_mp(999)
            self.log(f"{Colors.MAGENTA}Алтарь Источника: Ваши раны и мана полностью восстановлены!{Colors.RESET}")
        elif roll < 0.7:
            self.player.base_attack += 3
            self.log(f"{Colors.RED}Алтарь Войны: Ваша сила атаки навсегда выросла на +3!{Colors.RESET}")
        else:
            self.player.shield_hp += 60
            self.log(f"{Colors.CYAN}Алтарь Защиты: Древний щит окружил ваше тело (+60 щита)!{Colors.RESET}")

    def cast_skill(self, skill_idx: int) -> bool:
        """Активация боевых и защитных заклинаний."""
        if skill_idx < 1 or skill_idx > len(self.player.skills):
            return False

        skill = self.player.skills[skill_idx - 1]
        if not skill.is_ready:
            self.log(f"{Colors.GRAY}Способность '{skill.name}' перезаряжается ({skill.current_cd} ходов).{Colors.RESET}")
            return False

        if self.player.mp < skill.mana_cost:
            self.log(f"{Colors.BLUE}Недостаточно маны! Требуется {skill.mana_cost} MP.{Colors.RESET}")
            return False

        # Применение заклинания
        self.player.mp -= skill.mana_cost
        skill.current_cd = skill.cooldown

        if skill.id_num == 1:
            # Огненный шар (Fireball)
            visible_monsters = [m for m in self.map.monsters if m.is_alive and self.map.visible[m.y][m.x]]
            if not visible_monsters:
                self.log(f"{Colors.YELLOW}Огненный шар взорвался в воздухе: врагов в поле зрения нет.{Colors.RESET}")
            else:
                # Цель — ближайший монстр
                target = min(visible_monsters, key=lambda m: abs(m.x - self.player.x) + abs(m.y - self.player.y))
                self.log(f"{Colors.RED}{Colors.BOLD}ОГНЕННЫЙ ШАР ОБРУШИЛСЯ НА {target.name}!{Colors.RESET}")
                # Урон цели и соседям в радиусе 1
                for m in visible_monsters:
                    if abs(m.x - target.x) <= 1 and abs(m.y - target.y) <= 1:
                        dmg = m.take_damage(self.player.total_attack + 25)
                        m.add_effect(StatusEffect(EffectType.BURN, 3, 8, "Пламя"), self.log)
                        self.log(f"{m.name} охвачен огнём и получил {Colors.RED}{dmg} урона{Colors.RESET}!")
                        if not m.is_alive:
                            self.log(f"{Colors.GREEN}{m.name} испепелён!{Colors.RESET}")
                            self.player.add_xp(m.xp_reward, self.log)

        elif skill.id_num == 2:
            # Вихрь клинков
            hit_any = False
            for m in self.map.monsters:
                if m.is_alive and abs(m.x - self.player.x) <= 1 and abs(m.y - self.player.y) <= 1:
                    hit_any = True
                    dmg = m.take_damage(int(self.player.total_attack * 1.6))
                    self.log(f"Вихрь рассекает {m.name} на {Colors.RED}{dmg} урона{Colors.RESET}!")
                    if not m.is_alive:
                        self.log(f"{Colors.GREEN}{m.name} разрублен надвое!{Colors.RESET}")
                        self.player.add_xp(m.xp_reward, self.log)
            if not hit_any:
                self.log("Вы рассекли воздух вихрем, но рядом никого не оказалось.")

        elif skill.id_num == 3:
            # Теневой шаг (Телепорт в направлении)
            directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
            for dist in (4, 3, 2):
                chosen_dir = random.choice(directions)
                tx = self.player.x + chosen_dir[0] * dist
                ty = self.player.y + chosen_dir[1] * dist
                if self.map.is_walkable(tx, ty) and not any(m.x == tx and m.y == ty and m.is_alive for m in self.map.monsters):
                    self.player.x = tx
                    self.player.y = ty
                    self.log(f"{Colors.MAGENTA}Вы растворились в тенях и вышли на расстоянии {dist} клеток!{Colors.RESET}")
                    self.map.compute_fov(self.player.x, self.player.y)
                    break
            else:
                self.log("Теневой шаг не удался: вокруг сплошные преграды.")

        elif skill.id_num == 4:
            # Каменная кожа
            shield_val = 45 + self.player.level * 8
            self.player.shield_hp += shield_val
            self.player.add_effect(StatusEffect(EffectType.SHIELD, 6, shield_val, "Каменная кожа"), self.log)
            self.log(f"{Colors.CYAN}Каменная кожа затвердела на вашем теле (+{shield_val} щита)!{Colors.RESET}")

        return True

    def handle_monsters_turn(self) -> None:
        """Пошаговый искусственный интеллект монстров на базе поиска пути A*."""
        for m in self.map.monsters:
            if not m.is_alive:
                continue

            # Пропуск хода если оглушен
            if m.is_stunned:
                self.log(f"{m.name} оглушён и пропускает ход.")
                continue

            dist_manhattan = abs(self.player.x - m.x) + abs(self.player.y - m.y)

            # Проверка бдительности (если монстр видит игрока или подошёл близко)
            if self.map.visible[m.y][m.x] or dist_manhattan < 8:
                m.alerted = True

            if not m.alerted:
                continue

            # Ближний бой
            if dist_manhattan == 1:
                self.perform_melee_attack(m, self.player)
                if not self.player.is_alive:
                    break
                continue

            # Поведение лучника (атака на дистанции)
            if m.ai_type == MonsterAI.ARCHER and 2 <= dist_manhattan <= 5:
                # Проверка прямой видимости без стен
                if self.map.visible[m.y][m.x]:
                    self.log(f"{m.name} выпускает {Colors.YELLOW}ядовитую стрелу{Colors.RESET} в вас!")
                    dmg = self.player.take_damage(m.base_attack)
                    self.log(f"Стрела нанесла вам {Colors.RED}{dmg} урона{Colors.RESET}!")
                    if random.random() < 0.30:
                        self.player.add_effect(StatusEffect(EffectType.POISON, 3, 5, "Ядовитая стрела"), self.log)
                    if not self.player.is_alive:
                        break
                    continue

            # Поведение босса: призыв миньонов
            if m.ai_type == MonsterAI.BOSS and m.special_cd <= 0 and random.random() < 0.25:
                m.special_cd = 6
                self.log(f"{Colors.RED}{Colors.BOLD}{m.name} призывает миньонов из праха!{Colors.RESET}")
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    sx, sy = m.x + dx, m.y + dy
                    if self.map.is_walkable(sx, sy) and not any(other.x == sx and other.y == sy and other.is_alive for other in self.map.monsters):
                        minion = Monster(sx, sy, "Слуга Бездны", "m", Colors.MAGENTA, 35, 12, 3, xp_reward=20)
                        self.map.monsters.append(minion)
                        break

            # Перемещение к игроку по алгоритму A*
            path = self.map.find_path_astar((m.x, m.y), (self.player.x, self.player.y))
            if path:
                next_x, next_y = path[0]
                # Открытие закрытой двери монстром
                if self.map.tiles[next_y][next_x] == TileType.DOOR_CLOSED:
                    self.map.tiles[next_y][next_x] = TileType.DOOR_OPEN
                    if self.map.visible[next_y][next_x]:
                        self.log(f"{m.name} выбил дверь!")
                    continue

                # Проверка коллизий с другими живыми монстрами
                occupied = any(other.x == next_x and other.y == next_y and other.is_alive for other in self.map.monsters if other is not m)
                if not occupied and not (next_x == self.player.x and next_y == self.player.y):
                    m.x = next_x
                    m.y = next_y

    def tick_end_of_turn(self) -> None:
        """Обработка перезарядок способностей, регенерации и эффектов состояний."""
        # Перезарядка навыков героя
        for s in self.player.skills:
            if s.current_cd > 0:
                s.current_cd -= 1

        # Медленная пассивная регенерация маны героя (+1 MP в ход)
        self.player.restore_mp(1)

        # Тик эффектов героя
        self.player.status_effects = [
            eff for eff in self.player.status_effects if eff.tick(self.player, self.log)
        ]

        # Тик эффектов монстров
        for m in self.map.monsters:
            if m.is_alive:
                if m.special_cd > 0:
                    m.special_cd -= 1
                m.status_effects = [
                    eff for eff in m.status_effects if eff.tick(m, self.log)
                ]

    def open_inventory(self) -> None:
        while True:
            clear_screen()
            print("━" * 58)
            print(f" {Colors.BOLD}ИНВЕНТАРЬ И СНАРЯЖЕНИЕ ГЕРОЯ{Colors.RESET}")
            print("━" * 58)
            wep_s = self.player.equipped_weapon.get_stats_description() if self.player.equipped_weapon else "Пусто"
            arm_s = self.player.equipped_armor.get_stats_description() if self.player.equipped_armor else "Пусто"
            acc_s = self.player.equipped_accessory.get_stats_description() if self.player.equipped_accessory else "Пусто"
            boot_s = self.player.equipped_boots.get_stats_description() if self.player.equipped_boots else "Пусто"

            print(f" [Оружие] : {self.player.equipped_weapon.display_name if self.player.equipped_weapon else 'Кулаки'} ({wep_s})")
            print(f" [Доспех] : {self.player.equipped_armor.display_name if self.player.equipped_armor else 'Лохмотья'} ({arm_s})")
            print(f" [Амулет] : {self.player.equipped_accessory.display_name if self.player.equipped_accessory else 'Нет'} ({acc_s})")
            print(f" [Сапоги] : {self.player.equipped_boots.display_name if self.player.equipped_boots else 'Нет'} ({boot_s})")
            print("━" * 58)
            print(f"{Colors.BOLD}Предметы в рюкзаке ({len(self.player.inventory)}/18):{Colors.RESET}")
            if not self.player.inventory:
                print("  (Рюкзак пуст)")
            else:
                for idx, item in enumerate(self.player.inventory, start=1):
                    desc = item.get_stats_description()
                    print(f"  [{idx:2d}] {item.display_name} [{item.item_type.value}] — {desc}")

            print("━" * 58)
            print("Введите номер предмета для использования/экипировки,")
            print("или нажмите [Enter] для возврата: ", end="", flush=True)

            choice = input().strip()
            if not choice:
                break

            if choice.isdigit():
                val = int(choice)
                if 1 <= val <= len(self.player.inventory):
                    chosen = self.player.inventory.pop(val - 1)
                    if chosen.item_type in (ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY, ItemType.BOOTS):
                        old_gear = self.player.equip_item(chosen)
                        if old_gear:
                            self.player.inventory.append(old_gear)
                        self.log(f"Вы экипировали {chosen.display_name}!")
                        break
                    elif chosen.item_type == ItemType.POTION:
                        if chosen.value and self.player.hp >= self.player.max_hp and not chosen.mp_bonus:
                            self.player.inventory.insert(val - 1, chosen)
                            self.log("Здоровье уже на максимуме!")
                            continue
                        if chosen.value:
                            healed = self.player.heal(chosen.value)
                            self.log(f"Вы выпили зелье и восстановили {Colors.GREEN}+{healed} HP{Colors.RESET}!")
                        if chosen.mp_bonus:
                            m_rest = self.player.restore_mp(chosen.mp_bonus)
                            self.log(f"Вы восстановили {Colors.CYAN}+{m_rest} MP{Colors.RESET}!")
                        break
                    elif chosen.item_type == ItemType.SCROLL:
                        if chosen.effect == "cure":
                            self.player.status_effects.clear()
                            self.log(f"{Colors.CYAN}Свиток очищения снял все негативные эффекты!{Colors.RESET}")
                        break

    def show_character_sheet(self) -> None:
        clear_screen()
        print("━" * 54)
        print(f" {Colors.BOLD}ХАРАКТЕРИСТИКИ ПЕРСОНАЖА{Colors.RESET}")
        print("━" * 54)
        print(f" Имя героя       : {self.player.name}")
        print(f" Уровень         : {self.player.level}")
        print(f" Опыт            : {self.player.xp} / {self.player.xp_to_next_level}")
        print(f" Счёт            : {self.player.score}")
        print(f" Здоровье (HP)   : {self.player.hp} / {self.player.max_hp}")
        print(f" Мана (MP)       : {self.player.mp} / {self.player.max_mp}")
        print(f" Физический урон : {self.player.total_attack} (База {self.player.base_attack} + Экип {self.player.total_attack - self.player.base_attack})")
        print(f" Защита          : {self.player.total_defense} (База {self.player.base_defense} + Экип {self.player.total_defense - self.player.base_defense})")
        print(f" Шанс крита      : {int(self.player.crit_chance * 100)}%")
        print(f" Шанс уклонения  : {int(self.player.dodge_chance * 100)}%")
        print(f" Прочность щита  : {self.player.shield_hp}")
        print("━" * 54)
        print("Активные эффекты:")
        if not self.player.status_effects:
            print("  Нет активных эффектов.")
        else:
            for eff in self.player.status_effects:
                print(f"  • {eff.name}: {eff.duration} ходов осталось")
        print("━" * 54)
        input("Нажмите [Enter] для возврата в игру...")

    def show_help(self) -> None:
        clear_screen()
        print("━" * 56)
        print(f" {Colors.BOLD}РУКОВОДСТВО И УПРАВЛЕНИЕ В БЕЗДНЕ{Colors.RESET}")
        print("━" * 56)
        print("  W, A, S, D / Ц, Ф, Ы, В  - Движение и рукопашная атака")
        print("  1, 2, 3, 4               - Применение боевых заклинаний")
        print("  . / Space / Пробел       - Пропуск хода (ожидание)")
        print("  I / Ш                    - Открыть инвентарь и снаряжение")
        print("  C / С                    - Карточка персонажа и статистика")
        print("  > / Ю                    - Спуститься по лестнице на этаж глубже")
        print("  S / Ы                    - Быстрое сохранение игры")
        print("  H / Р                    - Это окно справки")
        print("  Q / Й                    - Выйти в главное меню / завершить")
        print("\nОбозначения на карте:")
        print(f"  {Colors.GREEN}@{Colors.RESET} - Ваш герой")
        print(f"  {Colors.RED}g, s, a, t, O{Colors.RESET} - Противники (гоблины, лучники, скелеты)")
        print(f"  {Colors.BG_RED}{Colors.WHITE}[БОСС]{Colors.RESET} - Грозный босс этажа")
        print(f"  {Colors.YELLOW}+{Colors.RESET} / {Colors.GRAY}/{Colors.RESET} - Двери (закрытая / открытая)")
        print(f"  {Colors.YELLOW}C{Colors.RESET} - Сундук с сокровищами (или мимик)")
        print(f"  {Colors.MAGENTA}&{Colors.RESET} - Святилище Древних Богов")
        print(f"  {Colors.RED}^{Colors.RESET} - Обнаруженная ловушка")
        print(f"  {Colors.CYAN}>{Colors.RESET} - Лестница на следующий этаж")
        print("━" * 56)
        input("Нажмите [Enter] для продолжения...")

    def save_game(self) -> None:
        """Сериализация прогресса в JSON файл."""
        try:
            data = {
                "floor": self.floor,
                "score": self.player.score,
                "player": {
                    "hp": self.player.hp,
                    "max_hp": self.player.max_hp,
                    "mp": self.player.mp,
                    "max_mp": self.player.max_mp,
                    "level": self.player.level,
                    "xp": self.player.xp,
                    "xp_to_next": self.player.xp_to_next_level,
                    "base_attack": self.player.base_attack,
                    "base_defense": self.player.base_defense,
                    "equipped_weapon": asdict(self.player.equipped_weapon) if self.player.equipped_weapon else None,
                    "equipped_armor": asdict(self.player.equipped_armor) if self.player.equipped_armor else None,
                    "equipped_accessory": asdict(self.player.equipped_accessory) if self.player.equipped_accessory else None,
                    "equipped_boots": asdict(self.player.equipped_boots) if self.player.equipped_boots else None,
                    "inventory": [asdict(it) for it in self.player.inventory],
                }
            }
            with open(self.SAVE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self.log(f"{Colors.GREEN}Игра успешно сохранена в {self.SAVE_FILE}!{Colors.RESET}")
        except Exception as e:
            self.log(f"{Colors.RED}Ошибка сохранения: {e}{Colors.RESET}")

    def load_game(self) -> bool:
        """Загрузка сохранённого состояния из JSON."""
        if not os.path.exists(self.SAVE_FILE):
            return False
        try:
            with open(self.SAVE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.floor = data["floor"]
            self.map = DungeonMap(width=56, height=20, floor=self.floor)
            self.player.x, self.player.y = self.map.rooms[0].center
            p_data = data["player"]
            self.player.hp = p_data["hp"]
            self.player.max_hp = p_data["max_hp"]
            self.player.mp = p_data["mp"]
            self.player.max_mp = p_data["max_mp"]
            self.player.level = p_data["level"]
            self.player.xp = p_data["xp"]
            self.player.xp_to_next_level = p_data["xp_to_next"]
            self.player.base_attack = p_data["base_attack"]
            self.player.base_defense = p_data["base_defense"]
            self.player.score = data.get("score", 0)

            def restore_item(d) -> Optional[Item]:
                if not d:
                    return None
                return Item(
                    name=d["name"],
                    item_type=ItemType(d["item_type"]),
                    rarity=Rarity(d["rarity"]),
                    atk_bonus=d.get("atk_bonus", 0),
                    def_bonus=d.get("def_bonus", 0),
                    hp_bonus=d.get("hp_bonus", 0),
                    mp_bonus=d.get("mp_bonus", 0),
                    value=d.get("value", 0),
                    symbol=d.get("symbol", "!"),
                    effect=d.get("effect", None)
                )

            self.player.equipped_weapon = restore_item(p_data["equipped_weapon"])
            self.player.equipped_armor = restore_item(p_data["equipped_armor"])
            self.player.equipped_accessory = restore_item(p_data["equipped_accessory"])
            self.player.equipped_boots = restore_item(p_data["equipped_boots"])
            self.player.inventory = [restore_item(it) for it in p_data["inventory"] if it is not None]

            self.map.compute_fov(self.player.x, self.player.y, radius=8)
            self.log(f"{Colors.GREEN}Прогресс успешно загружен! Этаж {self.floor}.{Colors.RESET}")
            return True
        except Exception as e:
            self.log(f"{Colors.RED}Ошибка загрузки: {e}{Colors.RESET}")
            return False

    def run(self) -> None:
        while self.player.is_alive:
            self.render()
            try:
                cmd = input().strip().lower()
            except (KeyboardInterrupt, EOFError):
                break

            action_taken = False
            # Перемещение / Атака
            if cmd in ("w", "ц"):
                action_taken = self.handle_player_move(0, -1)
            elif cmd in ("s", "ы"):
                action_taken = self.handle_player_move(0, 1)
            elif cmd in ("a", "ф"):
                action_taken = self.handle_player_move(-1, 0)
            elif cmd in ("d", "в"):
                action_taken = self.handle_player_move(1, 0)
            elif cmd in (".", "ю", " "):
                self.log("Вы выжидаете удобного момента...")
                action_taken = True
            elif cmd in (">", "э"):
                if (self.player.x, self.player.y) == self.map.stairs_pos:
                    self.next_floor()
                    action_taken = True
                else:
                    self.log("Здесь нет лестницы в бездну.")
            # Способности (1-4)
            elif cmd in ("1", "2", "3", "4"):
                action_taken = self.cast_skill(int(cmd))
            # Меню
            elif cmd in ("i", "ш"):
                self.open_inventory()
            elif cmd in ("c", "с"):
                self.show_character_sheet()
            elif cmd in ("h", "р"):
                self.show_help()
            elif cmd in ("save", "сохранить"):
                self.save_game()
            elif cmd in ("load", "загрузить"):
                self.load_game()
            elif cmd in ("q", "й"):
                confirm = input("Вы уверены, что хотите покинуть подземелье? (y/n): ").strip().lower()
                if confirm in ("y", "д", "да"):
                    print("\nВы покинули подземелье...")
                    return

            if action_taken:
                self.turns_count += 1
                self.handle_monsters_turn()
                self.tick_end_of_turn()

        # Экран гибели героя
        clear_screen()
        print("━" * 54)
        print(f"{Colors.RED}{Colors.BOLD}      ВЫ ПАЛИ ЖЕРТВОЙ ТЁМНОЙ БЕЗДНЫ...{Colors.RESET}")
        print("━" * 54)
        print(f" Достигнутый этаж  : {self.floor}")
        print(f" Уровень героя     : {self.player.level}")
        print(f" Набранные очки    : {self.player.score}")
        print(f" Прожито ходов     : {self.turns_count}")
        print(f" Сила атаки героя  : {self.player.total_attack}")
        print(f" Защита героя      : {self.player.total_defense}")
        print("━" * 54)
        print(" Слава смельчакам, бросившим вызов тьме!")
        print("━" * 54)


# =====================================================================
# ТОЧКА ВХОДА
# =====================================================================
if __name__ == "__main__":
    game = GameEngine()
    # Проверка наличия сохранения
    if os.path.exists(GameEngine.SAVE_FILE):
        clear_screen()
        print(f"{Colors.CYAN}{Colors.BOLD}Найдено сохранение прошлой игры!{Colors.RESET}")
        ans = input("Загрузить сохранение? (y/n): ").strip().lower()
        if ans in ("y", "д", "да", "1"):
            game.load_game()

    game.run()