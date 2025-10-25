# Система пролога

## Структура пролога

Пролог состоит из 5 событий с линейной последовательностью:

### События пролога

1. **main.prologue.001** - "Письмо из прошлого"
   - Возвращение в город детства
   - Единственная кнопка "Далее"

2. **main.prologue.002** - "Воспоминания" 
   - Размышления о прошлом и настоящем
   - Единственная кнопка "Далее"

3. **main.prologue.003** - "Тайна друга"
   - Детали о письме от Маркуса и артефакте
   - Единственная кнопка "Далее" 

4. **main.prologue.004** - "Последние приготовления"
   - Подготовка к путешествию
   - Единственная кнопка "Далее"

5. **main.prologue.end** - "Начало пути"
   - Финальное событие пролога
   - Кнопка "В деревню" с `next: "goto_location:village"`

## Особенности реализации

### 1. Правила событий пролога

```json
{
  "rules": {
    "once": true,
    "only_in_location": "main"
  }
}
```

- Все события пролога одноразовые (`once: true`)
- Привязаны к локации "main" (`only_in_location: "main"`)

### 2. Автопереход между событиями

Все события кроме последнего используют `"next": "auto"`:

```json
{
  "choices": [{
    "label": "Далее",
    "next": "auto"
  }]
}
```

API автоматически определяет следующее событие по ID:
- `main.prologue.001` → `main.prologue.002`
- `main.prologue.002` → `main.prologue.003`
- и т.д.

### 3. Переход в деревню

Последнее событие (`main.prologue.end`) использует специальную логику:

```json
{
  "choices": [{
    "label": "В деревню",
    "next": "goto_location:village"
  }]
}
```

### 4. Сброс seenIds при переходе

При переходе `main` → `village` автоматически:
- Сбрасываются `seenIds` только для типа 'main'
- Сохраняются все остальные просмотренные события
- Ход НЕ увеличивается (телепортация)

## Логика на фронтенде

### Обработка goto_location

```javascript
async handleLocationTransition(newLocation) {
  const oldLocation = this.state.location;
  this.state.location = newLocation;
  
  // Специальная обработка main → village
  if (oldLocation === 'main' && newLocation === 'village') {
    this.state.seenIds = this.state.seenIds.filter(id => 
      !id.startsWith('main.'));
  }
  
  // Немедленно загружаем следующее событие
  await this.loadNextEvent();
}
```

### Без увеличения хода

При `goto_location` переходах:
- `turn` НЕ увеличивается
- Текущее событие добавляется в `seenIds`
- Кулдауны не обновляются
- Сразу запрашивается следующее событие

## API обработка

### В common.php

```php
function handleLocationTransition($state, $newLocation) {
  $oldLocation = $state['location'] ?? null;
  $state['location'] = $newLocation;
  
  // Сброс main seenIds при переходе в village
  if ($oldLocation === 'main' && $newLocation === 'village') {
    $state['seenIds'] = array_values(array_filter(
      $state['seenIds'], 
      function($id) { return strpos($id, 'main.') !== 0; }
    ));
  }
  
  return $state;
}
```

### Поиск событий входа

```php
function findLocationEntryEvent($location) {
  $possibleIds = [
    $location . '.gate.001',
    $location . '.entrance.001',
    $location . '.start.001',
    $location . '.001'
  ];
  
  foreach ($possibleIds as $id) {
    $event = findEventById($id);
    if ($event) return $event;
  }
  
  return null;
}
```

## Тестирование

### test-prologue.html

Специальная страница для тестирования:
- Загрузка всех событий пролога
- Проверка последовательности
- Тест переходов

### Команды для проверки

```bash
# Проверить конкретное событие
GET /api/get.php?id=main.prologue.001

# Проверить последовательность
POST /api/next.php
{ "state": { "location": "main", ... } }
```

## Игровой поток

1. **Игра начинается** в локации "main"
2. **API возвращает** `main.prologue.001`
3. **Игрок нажимает** "Далее" 
4. **API возвращает** `main.prologue.002` (auto)
5. **Повторяется** до `main.prologue.end`
6. **Игрок нажимает** "В деревню"
7. **Фронтенд обрабатывает** `goto_location:village`
8. **Сбрасываются** main события из seenIds
9. **Локация меняется** на "village"
10. **API возвращает** `village.gate.001`

## Преимущества системы

### ✅ Гибкость
- Легко добавить новые события пролога
- Можно изменить порядок событий
- Поддержка ветвлений в будущем

### ✅ Производительность  
- Одноразовые события не повторяются
- Чистый переход между локациями
- Эффективная обработка состояния

### ✅ UX
- Плавные переходы без перезагрузки
- Сохранение прогресса
- Интуитивная навигация

---

*Обновлено: 2024-10-25*  
*Версия: 1.0*
