# Как добавить новую локацию

## Обзор

Данное руководство описывает процесс добавления новой локации в игру. Локация - это отдельная область игры с собственными событиями, правилами и механиками.

## Пошаговая инструкция

### 1. Создание структуры папок

Создайте новую папку для локации в директории `/events/`:

```
/events/
  /main/          # Существующая локация
  /village/       # Существующая локация  
  /new_location/  # Новая локация
    .gitkeep
    event-001.json
    event-002.json
    ...
```

**Пример:**
```bash
mkdir events/city
mkdir events/forest
mkdir events/dungeon
```

### 2. Создание событий локации

Создайте JSON-файлы событий по стандартной схеме:

#### Базовое событие входа

**Файл:** `/events/city/gate.json`
```json
{
    "id": "city.gate",
    "type": "city",
    "title": "Ворота города",
    "image": "/assets/city/gate.jpg",
    "text": "Вы подходите к величественным воротам большого города.",
    "choices": [
        {
            "label": "Войти в город",
            "next": "auto"
        }
    ],
    "effects": {
        "hp": 0,
        "damage": 0,
        "fame": 0,
        "gold": 0,
        "items_add": [],
        "items_remove": []
    },
    "rules": {
        "frequency": null,
        "chance": null,
        "cooldown": 0,
        "once": false,
        "only_in_location": "city",
        "child_roll": null
    },
    "tags": ["entrance", "city"],
    "version": 1
}
```

#### Обычные события локации

**Файл:** `/events/city/market.json`
```json
{
    "id": "city.market",
    "type": "city",
    "title": "Рыночная площадь",
    "image": "/assets/city/market.jpg",
    "text": "Шумный рынок полон торговцев и покупателей.",
    "choices": [
        {
            "label": "Купить еду (-3 золота, +5 HP)",
            "next": "auto",
            "cost": {"gold": 3},
            "benefit": {"hp": 5}
        },
        {
            "label": "Осмотреть товары",
            "next": "auto"
        }
    ],
    "effects": {
        "hp": 0,
        "damage": 0,
        "fame": 0,
        "gold": 0,
        "items_add": [],
        "items_remove": []
    },
    "rules": {
        "frequency": null,
        "chance": 0.4,
        "cooldown": 1,
        "once": false,
        "only_in_location": "city",
        "child_roll": null
    },
    "tags": ["service", "shopping"],
    "version": 1
}
```

### 3. Настройка правил локации

#### Обязательные поля для локации

```json
{
    "type": "city",                    // Должно совпадать с названием папки
    "only_in_location": "city",       // Для событий, привязанных к локации
    "rules": {
        "only_in_location": "city"    // Ограничение по локации
    }
}
```

#### Типы правил для событий

**1. Редкие события (случайные):**
```json
{
    "rules": {
        "chance": 0.1,        // 10% шанс появления
        "cooldown": 3,        // Кулдаун 3 хода
        "once": false,        // Можно повторять
        "only_in_location": "city"
    }
}
```

**2. Периодические события:**
```json
{
    "rules": {
        "frequency": {
            "kind": "every_n_turns",
            "n": 5
        },
        "only_in_location": "city"
    }
}
```

**3. Одноразовые события:**
```json
{
    "rules": {
        "once": true,
        "only_in_location": "city"
    }
}
```

### 4. Переходы между локациями

#### Создание переходов

**Из другой локации в новую:**
```json
{
    "choices": [
        {
            "label": "Отправиться в город",
            "next": "goto_location:city"
        }
    ]
}
```

**Из новой локации в другие:**
```json
{
    "choices": [
        {
            "label": "Вернуться в деревню",
            "next": "goto_location:village"
        },
        {
            "label": "Идти в лес",
            "next": "goto_location:forest"
        }
    ]
}
```

### 5. Примеры событий для разных типов локаций

#### Город (city)

**События:**
- `city.gate` - вход в город
- `city.market` - рынок (случайное)
- `city.tavern` - таверна (случайное)
- `city.guards` - встреча с стражами (редкое)
- `city.taxes` - налоги (каждые 7 ходов)

**Пример события с child_roll:**
```json
{
    "id": "city.tavern",
    "type": "city",
    "title": "Городская таверна",
    "text": "Шумная таверна полна горожан.",
    "choices": [{"label": "Войти", "next": "auto"}],
    "effects": {"hp": 0, "damage": 0, "fame": 0, "gold": 0, "items_add": [], "items_remove": []},
    "rules": {
        "chance": 0.3,
        "cooldown": 2,
        "only_in_location": "city",
        "child_roll": {
            "chance": 0.4,
            "pool": ["city.tavern.brawl", "city.tavern.gossip", "city.tavern.merchant"]
        }
    },
    "tags": ["service", "social"],
    "version": 1
}
```

#### Лес (forest)

**События:**
- `forest.entrance` - вход в лес
- `forest.exploration` - исследование (случайное)
- `forest.wolves` - встреча с волками (редкое)
- `forest.treasure` - найденный клад (очень редкое)
- `forest.camp` - лагерь (случайное)

**Пример опасного события:**
```json
{
    "id": "forest.wolves",
    "type": "forest",
    "title": "Встреча с волками",
    "text": "Из кустов выскакивает стая голодных волков!",
    "choices": [
        {
            "label": "Сражаться",
            "next": "auto"
        },
        {
            "label": "Бежать",
            "next": "auto"
        }
    ],
    "effects": {
        "hp": "combat:-6",
        "damage": 0,
        "fame": "+1",
        "gold": 0,
        "items_add": ["wolf_pelt"],
        "items_remove": []
    },
    "rules": {
        "chance": 0.15,
        "cooldown": 5,
        "once": false,
        "only_in_location": "forest",
        "child_roll": null
    },
    "tags": ["combat", "danger"],
    "version": 1
}
```

#### Подземелье (dungeon)

**События:**
- `dungeon.entrance` - вход в подземелье
- `dungeon.corridor` - коридор (случайное)
- `dungeon.trap` - ловушка (редкое)
- `dungeon.treasure` - сокровище (очень редкое)
- `dungeon.boss` - босс (уникальное)

**Пример босса:**
```json
{
    "id": "dungeon.boss",
    "type": "dungeon",
    "title": "Древний дракон",
    "text": "В глубине подземелья вас ждет древний дракон!",
    "choices": [
        {
            "label": "Сражаться с драконом",
            "next": "auto"
        },
        {
            "label": "Попытаться договориться",
            "next": "auto"
        }
    ],
    "effects": {
        "hp": "combat:-10",
        "damage": 0,
        "fame": "+5",
        "gold": "+50",
        "items_add": ["dragon_scale", "ancient_sword"],
        "items_remove": []
    },
    "rules": {
        "chance": 0.05,
        "cooldown": 0,
        "once": true,
        "only_in_location": "dungeon",
        "child_roll": null
    },
    "tags": ["boss", "combat", "treasure"],
    "version": 1
}
```

### 6. Настройка переходов в существующих локациях

#### Добавление перехода в деревне

**Файл:** `/events/village/road_to_city.json`
```json
{
    "id": "village.road_to_city",
    "type": "village",
    "title": "Дорога к городу",
    "text": "Вы видите дорогу, ведущую к большому городу.",
    "choices": [
        {
            "label": "Отправиться в город",
            "next": "goto_location:city"
        },
        {
            "label": "Остаться в деревне",
            "next": "auto"
        }
    ],
    "effects": {"hp": 0, "damage": 0, "fame": 0, "gold": 0, "items_add": [], "items_remove": []},
    "rules": {
        "frequency": null,
        "chance": 0.2,
        "cooldown": 0,
        "once": false,
        "only_in_location": "village",
        "child_roll": null
    },
    "tags": ["travel", "city"],
    "version": 1
}
```

### 7. Тестирование новой локации

#### Проверка событий

1. **Загрузите события:**
   ```bash
   GET /api/list.php?type=city
   ```

2. **Проверьте конкретное событие:**
   ```bash
   GET /api/get.php?id=city.gate
   ```

3. **Тестируйте переходы:**
   ```bash
   POST /api/next.php
   {
     "state": {
       "location": "city",
       "turn": 1,
       "seenIds": [],
       "cooldowns": {},
       "stats": {"hp": 20, "damage": 3, "fame": 0, "gold": 10, "debt": 0, "items": []}
     }
   }
   ```

#### Создание тестовой страницы

**Файл:** `/test-city-location.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test City Location</title>
</head>
<body>
    <h1>City Location Test</h1>
    <button onclick="testCityEvents()">Test City Events</button>
    <div id="results"></div>
    
    <script>
        async function testCityEvents() {
            const response = await fetch('/api/list.php?type=city');
            const data = await response.json();
            document.getElementById('results').innerHTML = 
                '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
    </script>
</body>
</html>
```

### 8. Рекомендации по дизайну локаций

#### Баланс событий

**Распределение по частоте:**
- **50%** - обычные события (chance: 0.3-0.5)
- **30%** - редкие события (chance: 0.1-0.2)
- **15%** - периодические события (frequency)
- **5%** - уникальные события (once: true)

#### Теги для организации

```json
{
    "tags": [
        "entrance",    // Вход в локацию
        "service",     // Услуги (лечение, торговля)
        "combat",      // Боевые события
        "treasure",    // Сокровища
        "danger",      // Опасные события
        "social",      // Социальные взаимодействия
        "travel"       // Путешествия
    ]
}
```

#### Экономический баланс

**Доходы и расходы:**
- **Доходы:** treasure, rewards, trading
- **Расходы:** taxes, rent, services, combat
- **Баланс:** примерно равные доходы и расходы

### 9. Продвинутые техники

#### Связанные события

```json
{
    "id": "city.merchant.quest",
    "type": "city",
    "title": "Квест торговца",
    "text": "Торговец просит вас доставить товар в лес.",
    "choices": [
        {
            "label": "Согласиться",
            "next": "goto_location:forest"
        }
    ],
    "effects": {
        "items_add": ["merchant_package"],
        "gold": "+10"
    },
    "rules": {
        "once": true,
        "only_in_location": "city"
    }
}
```

#### Условные события

```json
{
    "id": "city.noble_party",
    "type": "city",
    "title": "Прием у дворянина",
    "text": "Вас приглашают на прием к местному дворянину.",
    "choices": [{"label": "Принять приглашение", "next": "auto"}],
    "effects": {"fame": "+3", "gold": "+20"},
    "rules": {
        "chance": 0.1,
        "once": true,
        "only_in_location": "city",
        "requires": {"fame": 10}  // Только если слава >= 10
    }
}
```

## Заключение

Добавление новой локации включает:

1. ✅ **Создание папки** `/events/<location>/`
2. ✅ **Написание событий** по стандартной схеме
3. ✅ **Настройка правил** (chance, frequency, once)
4. ✅ **Создание переходов** через `goto_location:`
5. ✅ **Тестирование** и балансировка
6. ✅ **Документирование** особенностей локации

**Результат:** Полнофункциональная локация с уникальными событиями, правилами и переходами, интегрированная в общую игровую систему.

---

*Обновлено: 2024-10-25*  
*Версия: 1.0*
