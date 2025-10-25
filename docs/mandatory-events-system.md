# Mandatory Events System

## Обзор

Система обязательных событий обеспечивает приоритетное выполнение событий с `frequency.kind == 'every_n_turns'` в определенные ходы игры.

## Механика работы

### 1. Приоритетная очередь

События с `frequency.kind == 'every_n_turns'` имеют высший приоритет:

1. **Обязательные события** (every_n_turns) - высший приоритет
2. **Приоритетные события** (другие frequency) - средний приоритет  
3. **Обычные события** - низший приоритет

### 2. Условия срабатывания

```json
{
  "rules": {
    "frequency": {
      "kind": "every_n_turns",
      "n": 10
    },
    "only_in_location": "village"
  }
}
```

**Событие срабатывает если:**
- `state.turn > 0`
- `state.turn % n == 0` (кратно N)
- `only_in_location` совпадает с текущей локацией
- Событие не на кулдауне
- Событие не было просмотрено (если `once: true`)

### 3. Пример: Аренда жилья

```json
{
  "id": "village.rent",
  "title": "Аренда жилья",
  "rules": {
    "frequency": {
      "kind": "every_n_turns", 
      "n": 10
    },
    "only_in_location": "village"
  },
  "effects": {
    "gold": -5
  }
}
```

**Срабатывает на ходах:** 10, 20, 30, 40...

## API Implementation

### В common.php

```php
function isEventMandatory($event, $state) {
    $rules = $event['data']['rules'] ?? [];
    $turn = $state['turn'] ?? 1;
    $location = $state['location'] ?? null;
    
    if (!isset($rules['frequency']) || $rules['frequency'] === null) {
        return false;
    }
    
    $frequency = $rules['frequency'];
    
    if ($frequency['kind'] === 'every_n_turns') {
        $n = $frequency['n'] ?? 1;
        
        // Обязательно срабатывает каждые N ходов
        if ($turn > 0 && ($turn % $n) === 0) {
            // Дополнительная проверка локации
            if (isset($rules['only_in_location']) && $rules['only_in_location'] !== null) {
                return $location === $rules['only_in_location'];
            }
            return true;
        }
    }
    
    return false;
}
```

### В next.php

```php
// Этап 1: Ищем обязательные события
$mandatoryEvents = [];
foreach ($locationEvents as $event) {
    if (isEventAvailable($event, $normalizedState) && isEventMandatory($event, $normalizedState)) {
        $mandatoryEvents[] = $event;
    }
}

// Приоритет выбора
if (!empty($mandatoryEvents)) {
    $selectedEvent = $mandatoryEvents[array_rand($mandatoryEvents)];
} else if (!empty($priorityEvents)) {
    $selectedEvent = $priorityEvents[array_rand($priorityEvents)];
} else {
    // Обычные события
}
```

## Система долгов

### 1. Механика долгов

При недостатке золота для оплаты (≤ 5 золота):
- Автоматически берется долг
- `state.stats.debt` увеличивается
- Показывается предупреждение игроку

### 2. Фронтенд обработка

```javascript
applyCostBenefit(cost, benefit) {
    if (cost.gold && this.state.stats.gold < cost.gold) {
        // Проверяем возможность взять в долг
        if (cost.gold <= 5 && this.state.stats.gold < cost.gold) {
            const debtAmount = cost.gold - this.state.stats.gold;
            this.state.stats.debt = (this.state.stats.debt || 0) + debtAmount;
            this.state.stats.gold = 0;
            this.showDebtWarning(debtAmount);
        } else {
            return false; // Недостаточно золота
        }
    }
}
```

### 3. UI предупреждения

```javascript
showDebtWarning(debtAmount) {
    const warningHtml = `
        <div class="debt-warning">
            <strong>⚠️ Взят долг!</strong><br>
            Долг: +${debtAmount} золота<br>
            <small>Общий долг: ${this.state.stats.debt}</small>
        </div>
    `;
    // Показываем предупреждение на 3 секунды
}
```

## Метаданные ответа

```json
{
  "meta": {
    "was_mandatory": true,
    "was_priority": false,
    "selection_method": "mandatory",
    "turn": 10,
    "location": "village"
  }
}
```

## Примеры использования

### 1. Аренда жилья (каждые 10 ходов)

```json
{
  "id": "village.rent",
  "rules": {
    "frequency": { "kind": "every_n_turns", "n": 10 },
    "only_in_location": "village"
  },
  "effects": { "gold": -5 }
}
```

### 2. Налоги (каждые 5 ходов)

```json
{
  "id": "city.taxes",
  "rules": {
    "frequency": { "kind": "every_n_turns", "n": 5 },
    "only_in_location": "city"
  },
  "effects": { "gold": -3, "fame": -1 }
}
```

### 3. Праздник (каждые 15 ходов)

```json
{
  "id": "village.festival",
  "rules": {
    "frequency": { "kind": "every_n_turns", "n": 15 },
    "only_in_location": "village"
  },
  "effects": { "hp": 5, "fame": 2, "gold": 10 }
}
```

## Тестирование

### test-mandatory-events.html

Специальная страница для тестирования:
- Проверка срабатывания на нужных ходах
- Тестирование системы долгов
- Статистика обязательных событий

### Команды для проверки

```bash
# Тест на 10-м ходу (должно сработать)
POST /api/next.php
{ "state": { "location": "village", "turn": 10, ... } }

# Тест на 5-м ходу (не должно сработать)
POST /api/next.php  
{ "state": { "location": "village", "turn": 5, ... } }
```

## Преимущества системы

### ✅ Предсказуемость
- Игрок знает, что каждые N ходов произойдет событие
- Планирование ресурсов и стратегии
- Регулярные игровые циклы

### ✅ Иммерсивность
- Реалистичные игровые механики (аренда, налоги)
- Экономическое давление на игрока
- Система долгов добавляет глубину

### ✅ Баланс
- Контролируемые обязательные расходы
- Возможность взять в долг в критических ситуациях
- Настраиваемая частота событий

## Ограничения

### ⚠️ Жесткость
- Обязательные события могут нарушать планы игрока
- Необходимость планирования ресурсов
- Потенциальное раздражение от принуждения

### ⚠️ Сложность баланса
- Слишком частые обязательные события
- Недостаток ресурсов для развития
- Необходимость тонкой настройки

---

*Обновлено: 2024-10-25*  
*Версия: 1.0*
