# Быстрый старт - JSON схема событий

## Создание нового события

1. **Выберите локацию**: `main`, `village`, `shared` или создайте новую
2. **Придумайте ID**: `{type}.{category}.{number}` (например: `village.tavern.001`)
3. **Создайте JSON файл** с именем равным ID

## Пример простого события

```json
{
  "id": "village.market.001",
  "type": "village",
  "title": "Рыночная площадь",
  "text": "Торговцы зазывают покупателей...",
  "choices": [
    { "label": "Купить провизию", "next": "village.market.buy.001" },
    { "label": "Уйти", "next": "village.gate.001" }
  ],
  "effects": {
    "hp": 0, "damage": 0, "fame": 0, "gold": 0,
    "items_add": [], "items_remove": []
  },
  "rules": {
    "frequency": null, "chance": null, "cooldown": 0,
    "once": false, "only_in_location": "village", "child_roll": null
  },
  "tags": ["market", "shopping"],
  "version": 1
}
```

## Специальные значения `next`

- `"auto"` - автоматический переход к следующему событию по номеру
- `"end"` - завершение истории
- `"child_roll"` - случайный выбор из `rules.child_roll.pool`
- `"village.gate.001"` - переход к конкретному событию

## Проверка событий через API

```bash
# Получить список событий деревни
GET /api/list.php?area=village&type=events

# Получить конкретное событие
GET /api/get.php?area=village&id=village.gate.001

# Переход к следующему событию
POST /api/next.php
{
  "area": "village",
  "current_id": "village.gate.001",
  "choice": "Зайти в таверну 'Золотой кубок'"
}
```

## Советы

1. **Именование файлов**: `{id}.json` (например: `village.tavern.001.json`)
2. **Изображения**: `/assets/{type}/{category}-{number}.jpg`
3. **Тестирование**: Проверяйте JSON на валидность
4. **Версионность**: Всегда указывайте `"version": 1`
5. **Эффекты**: Используйте отрицательные значения для уменьшения характеристик

## Пример с эффектами и правилами

```json
{
  "id": "village.healer.treatment",
  "type": "village", 
  "title": "Лечение у целителя",
  "text": "Целитель восстанавливает ваши силы...",
  "choices": [
    { "label": "Поблагодарить", "next": "auto" }
  ],
  "effects": {
    "hp": 50,
    "gold": -25,
    "fame": 1,
    "items_add": ["blessing_charm"]
  },
  "rules": {
    "cooldown": 5,
    "only_in_location": "village"
  },
  "tags": ["healing", "service"],
  "version": 1
}
```
