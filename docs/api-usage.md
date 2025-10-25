# API Documentation

## Endpoints

### GET /api/list.php

Получает список всех событий с возможностью фильтрации по типу.

**Параметры:**
- `type` (опционально) - фильтр по типу события (`main`, `village`, `shared`)

**Пример запроса:**
```bash
GET /api/list.php?type=village
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "village.tavern",
        "path": "../events/village/tavern.json",
        "type": "village",
        "title": "Таверна у перекрёстка",
        "filename": "tavern.json",
        "tags": ["service", "healing"],
        "rules": {
          "once": false,
          "chance": 0.35,
          "only_in_location": "village",
          "frequency": null
        }
      }
    ],
    "count": 1,
    "filter": { "type": "village" },
    "total_scanned": 12
  }
}
```

### GET /api/get.php

Получает полную информацию о конкретном событии по ID.

**Параметры:**
- `id` (обязательно) - ID события

**Пример запроса:**
```bash
GET /api/get.php?id=village.tavern
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "id": "village.tavern",
    "type": "village",
    "title": "Таверна у перекрёстка",
    "text": "Тепло, шум и запах тушёного мяса...",
    "choices": [
      {
        "label": "Поесть и отдохнуть (-3 золота, +HP)",
        "next": "auto",
        "cost": { "gold": 3 },
        "benefit": { "hp": "+8" }
      }
    ],
    "effects": { "hp": 0, "gold": 0, "fame": 0, "damage": 0 },
    "rules": { "chance": 0.35, "cooldown": 1 },
    "tags": ["service", "healing"],
    "version": 1,
    "meta": {
      "id": "village.tavern",
      "path": "../events/village/tavern.json",
      "type": "village",
      "filename": "tavern.json",
      "last_modified": 1640995200,
      "schema_version": 1
    }
  }
}
```

### POST /api/next.php

Вычисляет следующее событие на основе текущего состояния игры.

**Тело запроса:**
```json
{
  "state": {
    "location": "village",
    "turn": 5,
    "seenIds": ["village.gate.001"],
    "cooldowns": {"village.tavern": 2},
    "stats": {
      "hp": 85,
      "damage": 0,
      "fame": 3,
      "gold": 15,
      "items": ["healing_potion"]
    }
  }
}
```

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "village.tavern.gambling",
      "type": "village",
      "title": "Азартные игры",
      "text": "За столом идёт игра в кости...",
      "choices": [
        {
          "label": "Поставить 3 золота",
          "next": "auto"
        }
      ],
      "effects": {
        "gold": "chance:0.5,+6,-3"
      },
      "meta": {
        "selected_from": 8,
        "available_count": 5,
        "priority_count": 0,
        "was_priority": false,
        "was_child_roll": true,
        "original_event_id": "village.tavern",
        "selection_method": "random"
      }
    },
    "state": {
      "location": "village",
      "turn": 6,
      "seenIds": ["village.gate.001", "village.tavern.gambling"],
      "cooldowns": {"village.tavern": 1},
      "stats": { "hp": 85, "gold": 15, "fame": 3, "items": [] }
    }
  }
}
```

## Логика выбора событий

### Этапы фильтрации

1. **Фильтрация по локации** - события из текущей локации + shared события
2. **Проверка доступности:**
   - `once: true` и ID в `seenIds` → исключить
   - ID в `cooldowns` с значением > 0 → исключить  
   - `only_in_location` не совпадает → исключить
   - `chance` не прошла проверку → исключить
3. **Приоритетные события** - события с `frequency.every_n_turns` где `turn % n == 0`
4. **Случайный выбор** из доступных событий
5. **Child roll** - если у события есть `child_roll` и шанс срабатывает

### Правила событий

#### Frequency
```json
{
  "frequency": {
    "kind": "every_n_turns",
    "n": 10
  }
}
```

#### Chance
```json
{
  "chance": 0.35  // 35% шанс появления
}
```

#### Cooldown
```json
{
  "cooldown": 3  // 3 хода до повторного появления
}
```

#### Child Roll
```json
{
  "child_roll": {
    "chance": 0.5,
    "pool": [
      "village.tavern.fight",
      "village.tavern.gambling"
    ]
  }
}
```

## Кэширование

API использует in-memory кэширование событий:
- Кэш создается при первом обращении к `scanEvents()`
- Сбрасывается при каждом новом запросе
- Можно принудительно сбросить через `clearEventsCache()`

## Тестирование

Используйте `/api/test.php` для диагностики:
- Список всех событий
- Статистика по типам
- Симуляция выбора событий
- Проверка доступности

## Обработка ошибок

Все API endpoints возвращают стандартный формат ошибок:

```json
{
  "success": false,
  "error": "Описание ошибки"
}
```

HTTP коды:
- `400` - неверные параметры
- `404` - событие не найдено
- `500` - внутренняя ошибка сервера
