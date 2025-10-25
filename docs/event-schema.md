# Схема JSON для событий

## Общий формат

Каждое событие в игре представляется отдельным JSON файлом следующего формата:

```json
{
  "id": "main.prologue.001",
  "type": "main",
  "title": "Пролог: Письмо из прошлого",
  "image": "/assets/main/prologue-001.jpg",
  "text": "…тут текст события…",
  "choices": [
    { "label": "Далее", "next": "auto" }
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
    "only_in_location": "village|null",
    "child_roll": {
      "chance": 0.5,
      "pool": [
        "village.tavern.fight",
        "village.tavern.drink_tournament",
        "village.tavern.gambling"
      ]
    }
  },
  "tags": ["service", "healing"],
  "version": 1
}
```

## Описание полей

### Основные поля

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | string | ✅ | Уникальный идентификатор события в формате `{type}.{category}.{number}` |
| `type` | string | ✅ | Тип/ветка события: `main`, `village`, `forest`, etc. |
| `title` | string | ✅ | Заголовок события |
| `image` | string | ❌ | Путь к изображению события относительно корня сайта |
| `text` | string | ✅ | Основной текст события |
| `choices` | array | ✅ | Массив доступных выборов игрока |
| `effects` | object | ❌ | Эффекты, применяемые при завершении события |
| `rules` | object | ❌ | Правила срабатывания события |
| `tags` | array | ❌ | Теги для категоризации события |
| `version` | number | ✅ | Версия схемы (текущая: 1) |

### Поле `choices`

Массив объектов с выборами игрока:

```json
{
  "label": "Текст выбора",
  "next": "main.prologue.002"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `label` | string | Текст, отображаемый игроку |
| `next` | string | ID следующего события или специальное значение |

#### Специальные значения для `next`:
- `"auto"` - автоматический переход к следующему событию по порядку
- `"end"` - завершение ветки событий
- `"random"` - случайный выбор из доступных событий
- `"child_roll"` - использовать правило `child_roll` из `rules`

### Поле `effects`

Эффекты, применяемые к игроку при завершении события:

```json
{
  "hp": 10,
  "damage": -5,
  "fame": 1,
  "gold": 50,
  "items_add": ["healing_potion", "old_key"],
  "items_remove": ["broken_sword"]
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `hp` | number | Изменение здоровья (может быть отрицательным) |
| `damage` | number | Получаемый урон |
| `fame` | number | Изменение репутации/славы |
| `gold` | number | Изменение количества золота |
| `items_add` | array | Массив ID предметов для добавления |
| `items_remove` | array | Массив ID предметов для удаления |

### Поле `rules`

Правила срабатывания события:

```json
{
  "frequency": {"kind": "every_n_turns", "n": 10},
  "chance": 0.3,
  "cooldown": 5,
  "once": true,
  "only_in_location": "village",
  "child_roll": {
    "chance": 0.5,
    "pool": ["event1", "event2", "event3"]
  }
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `frequency` | object/null | Правило частоты срабатывания |
| `chance` | number/null | Шанс срабатывания (0.0 - 1.0) |
| `cooldown` | number | Кулдаун в ходах перед повторным срабатыванием |
| `once` | boolean | Событие может произойти только один раз |
| `only_in_location` | string/null | Ограничение по локации |
| `child_roll` | object/null | Настройки для случайного выбора дочерних событий |

#### Типы `frequency`:
- `{"kind": "every_n_turns", "n": 10}` - каждые N ходов
- `{"kind": "random", "min": 5, "max": 15}` - случайно между min и max ходов
- `null` - без ограничений по частоте

#### Поле `child_roll`:
- `chance` - шанс срабатывания (0.0 - 1.0) 
- `pool` - массив ID событий для случайного выбора

## Примеры событий

### Простое линейное событие

```json
{
  "id": "main.prologue.001",
  "type": "main",
  "title": "Пролог: Начало пути",
  "text": "Вы просыпаетесь в незнакомом месте. Солнце встает над горизонтом.",
  "choices": [
    { "label": "Далее", "next": "auto" }
  ],
  "version": 1
}
```

### Событие с выбором

```json
{
  "id": "village.crossroads.001",
  "type": "village", 
  "title": "Перекресток",
  "text": "Перед вами три дороги. Куда направитесь?",
  "choices": [
    { "label": "На север, к горам", "next": "mountain.entrance.001" },
    { "label": "На восток, к лесу", "next": "forest.entrance.001" },
    { "label": "Остаться в деревне", "next": "village.center.001" }
  ],
  "version": 1
}
```

### Событие с эффектами и правилами

```json
{
  "id": "village.tavern.healing",
  "type": "village",
  "title": "Лечение в таверне",
  "text": "Местная целительница предлагает восстановить ваши силы за 20 золотых.",
  "choices": [
    { "label": "Согласиться", "next": "village.tavern.healed" },
    { "label": "Отказаться", "next": "village.tavern.main" }
  ],
  "effects": {
    "hp": 50,
    "gold": -20
  },
  "rules": {
    "cooldown": 3,
    "only_in_location": "village"
  },
  "tags": ["service", "healing"],
  "version": 1
}
```

### Событие со случайными дочерними событиями

```json
{
  "id": "village.tavern.random_encounter",
  "type": "village",
  "title": "Случайная встреча в таверне",
  "text": "В таверне происходит что-то интересное...",
  "choices": [
    { "label": "Подойти ближе", "next": "child_roll" }
  ],
  "rules": {
    "child_roll": {
      "chance": 1.0,
      "pool": [
        "village.tavern.fight",
        "village.tavern.drink_tournament", 
        "village.tavern.gambling",
        "village.tavern.storyteller"
      ]
    }
  },
  "tags": ["random", "social"],
  "version": 1
}
```

## Соглашения по именованию

### ID событий
Формат: `{type}.{category}.{number}`

Примеры:
- `main.prologue.001` - основная сюжетная линия, пролог, событие 1
- `village.tavern.fight` - деревня, таверна, драка
- `forest.deep.encounter.wolves` - лес, глубина, встреча с волками

### Файлы
Имя файла должно соответствовать ID события:
- `main.prologue.001.json`
- `village.tavern.fight.json`

### Изображения
Путь к изображениям: `/assets/{type}/{category}-{number}.jpg`
- `/assets/main/prologue-001.jpg`
- `/assets/village/tavern-fight.jpg`

## Валидация

При загрузке события API должно проверять:

1. ✅ Обязательные поля присутствуют
2. ✅ ID уникален в системе
3. ✅ Все ссылки в `next` ведут на существующие события
4. ✅ Числовые значения в допустимых диапазонах
5. ✅ Версия схемы поддерживается

## Миграция

При изменении схемы:
1. Увеличить номер версии
2. Добавить правила миграции для старых версий
3. Обновить валидацию API
4. Постепенно обновить существующие события

---

*Версия документации: 1.0*  
*Дата обновления: 2024-10-25*
