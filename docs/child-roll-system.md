# Child Roll System

## Обзор

Child Roll система позволяет базовым событиям случайно генерировать дочерние события с уникальными эффектами.

## Механика работы

### 1. Базовое событие с child_roll

```json
{
  "id": "village.tavern",
  "rules": {
    "child_roll": {
      "chance": 0.5,
      "pool": [
        "village.tavern.fight",
        "village.tavern.drink_tournament", 
        "village.tavern.gambling"
      ]
    }
  }
}
```

### 2. Логика выбора

1. **Выбирается базовое событие** (например, `village.tavern`)
2. **Проверяется child_roll** - если `rand() < chance`
3. **Случайно выбирается** ID из `pool`
4. **Возвращается дочернее событие** вместо базового

### 3. Обработка состояния

- **seenIds** обновляется для фактически отданного события (child)
- **Кулдаун** применяется к базовому событию (родителю)
- **Метаданные** содержат информацию о child_roll

## Случайные эффекты

### Drink Tournament
```json
{
  "effects": {
    "hp": "random:-2,4",    // HP от -2 до +4
    "gold": -1              // -1 золото
  }
}
```

### Gambling
```json
{
  "effects": {
    "gold": "chance:0.5,+6,-3"  // 50% +6, иначе -3
  }
}
```

### Fight
```json
{
  "effects": {
    "hp": "random:-6,-1"    // Урон от -1 до -6
  }
}
```

## API Implementation

### В next.php

```php
// Проверяем child_roll для выбранного события
$finalEvent = $selectedEvent;
$wasChildRoll = false;

if ($selectedEvent && isset($selectedEvent['data']['rules']['child_roll'])) {
    $childRoll = $selectedEvent['data']['rules']['child_roll'];
    $chance = $childRoll['chance'] ?? 0.5;
    $pool = $childRoll['pool'] ?? [];
    
    if (!empty($pool) && rng() < $chance) {
        $childId = $pool[array_rand($pool)];
        $childEvent = findEventById($childId);
        
        if ($childEvent) {
            $finalEvent = $childEvent;
            $wasChildRoll = true;
        }
    }
}

// Применяем случайные эффекты
$eventData = applyRandomEffects($finalEvent['data']);
```

### Функция applyRandomEffects

```php
function applyRandomEffects($eventData) {
    $eventId = $eventData['id'] ?? '';
    
    if (strpos($eventId, 'village.tavern.') === 0) {
        $effects = $eventData['effects'] ?? [];
        
        if (strpos($eventId, 'drink_tournament') !== false) {
            $effects['hp'] = 'random:-2,4';
            $effects['gold'] = -1;
        }
        
        if (strpos($eventId, 'gambling') !== false) {
            $effects['gold'] = 'chance:0.5,+6,-3';
        }
        
        if (strpos($eventId, 'fight') !== false) {
            $effects['hp'] = 'random:-6,-1';
        }
        
        $eventData['effects'] = $effects;
    }
    
    return $eventData;
}
```

## Метаданные ответа

```json
{
  "meta": {
    "was_child_roll": true,
    "original_event_id": "village.tavern",
    "child_event_id": "village.tavern.fight",
    "selection_method": "random"
  }
}
```

## Состояние игры

### Обновление seenIds

- Добавляется ID **фактически отданного** события (child)
- Базовое событие (parent) **НЕ** добавляется в seenIds

### Кулдауны

- Кулдаун применяется к **базовому событию** (parent)
- Дочерние события **НЕ** имеют собственных кулдаунов

## Примеры использования

### 1. Таверна с случайными встречами

```json
{
  "id": "village.tavern",
  "rules": {
    "child_roll": {
      "chance": 0.5,
      "pool": ["village.tavern.fight", "village.tavern.gambling"]
    }
  }
}
```

### 2. Лес с опасностями

```json
{
  "id": "forest.exploration",
  "rules": {
    "child_roll": {
      "chance": 0.3,
      "pool": ["forest.wolves", "forest.trap", "forest.treasure"]
    }
  }
}
```

### 3. Городские события

```json
{
  "id": "city.square",
  "rules": {
    "child_roll": {
      "chance": 0.7,
      "pool": ["city.market", "city.guards", "city.beggar"]
    }
  }
}
```

## Тестирование

### test-child-roll.html

Специальная страница для тестирования:
- Проверка child_roll механики
- Статистика срабатываний
- Анализ эффектов

### Команды для проверки

```bash
# Тест базового события
POST /api/next.php
{ "state": { "location": "village", ... } }

# Проверка метаданных
GET /api/get.php?id=village.tavern
```

## Преимущества системы

### ✅ Гибкость
- Базовые события могут иметь множество вариантов
- Легко добавлять новые дочерние события
- Настраиваемая вероятность срабатывания

### ✅ Реиграбельность
- Одинаковые базовые события дают разные результаты
- Повышает интерес к повторному прохождению
- Создает уникальные игровые сессии

### ✅ Баланс
- Контролируемая случайность
- Настраиваемые эффекты
- Сохранение игрового баланса

## Ограничения

### ⚠️ Производительность
- Дополнительные запросы к базе событий
- Обработка случайных эффектов
- Усложнение логики

### ⚠️ Сложность отладки
- Случайные результаты сложнее тестировать
- Необходимость статистического анализа
- Потенциальные edge cases

---

*Обновлено: 2024-10-25*  
*Версия: 1.0*
