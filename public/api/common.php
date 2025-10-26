<?php
/**
 * Общие утилиты для API игровых событий
 */

// Глобальный кэш событий
$EVENTS_CACHE = null;

/**
 * Сканирует все события и создает индекс
 * @return array Массив событий с индексацией по ID
 */
function scanEvents() {
    global $EVENTS_CACHE;
    
    // Возвращаем кэш если доступен
    if ($EVENTS_CACHE !== null) {
        return $EVENTS_CACHE;
    }
    
    $events = [];
    $eventsDir = '../../events';
    
    if (!is_dir($eventsDir)) {
        return [];
    }
    
    // Сканируем все подкаталоги
    $directories = glob($eventsDir . '/*', GLOB_ONLYDIR);
    
    foreach ($directories as $dir) {
        $type = basename($dir);
        $files = glob($dir . '/*.json');
        
        foreach ($files as $file) {
            try {
                $data = loadJsonFile($file);
                if ($data && isset($data['id'])) {
                    $events[$data['id']] = [
                        'id' => $data['id'],
                        'path' => $file,
                        'type' => $data['type'] ?? $type,
                        'data' => $data,
                        'filename' => basename($file),
                        'mtime' => filemtime($file)
                    ];
                }
            } catch (Exception $e) {
                error_log("Error loading event file {$file}: " . $e->getMessage());
            }
        }
    }
    
    // Кэшируем результат
    $EVENTS_CACHE = $events;
    
    return $events;
}

/**
 * Находит событие по ID
 * @param string $id ID события
 * @return array|null Данные события или null
 */
function findEventById($id) {
    $events = scanEvents();
    return isset($events[$id]) ? $events[$id] : null;
}

/**
 * Загружает и парсит JSON файл
 * @param string $filepath Путь к файлу
 * @return array|null Данные или null при ошибке
 */
function loadJsonFile($filepath) {
    if (!file_exists($filepath)) {
        return null;
    }
    
    $content = file_get_contents($filepath);
    if ($content === false) {
        return null;
    }
    
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON parse error in {$filepath}: " . json_last_error_msg());
    }
    
    return $data;
}

/**
 * Генератор случайных чисел с сидом
 * @param float $min Минимальное значение (по умолчанию 0.0)
 * @param float $max Максимальное значение (по умолчанию 1.0)
 * @return float Случайное число
 */
function rng($min = 0.0, $max = 1.0) {
    return $min + (mt_rand() / mt_getrandmax()) * ($max - $min);
}

/**
 * Проверяет, доступно ли событие согласно правилам
 * @param array $event Данные события
 * @param array $state Состояние игры
 * @return bool
 */
function isEventAvailable($event, $state) {
    $rules = $event['data']['rules'] ?? [];
    $id = $event['id'];
    $turn = $state['turn'] ?? 1;
    $seenIds = $state['seenIds'] ?? [];
    $cooldowns = $state['cooldowns'] ?? [];
    $location = $state['location'] ?? null;
    
    // Проверка one-time событий
    if (($rules['once'] ?? false) && in_array($id, $seenIds)) {
        return false;
    }
    
    // Проверка кулдауна
    if (isset($cooldowns[$id]) && $cooldowns[$id] > 0) {
        return false;
    }
    
    // Проверка локации
    if (isset($rules['only_in_location']) && $rules['only_in_location'] !== null) {
        if ($location !== $rules['only_in_location']) {
            return false;
        }
    }
    
    // Проверка базового шанса
    if (isset($rules['chance']) && $rules['chance'] !== null) {
        if (rng() >= $rules['chance']) {
            return false;
        }
    }
    
    return true;
}

/**
 * Обрабатывает переходы goto_location
 * @param array $state Состояние игры
 * @param string $newLocation Новая локация
 * @return array Обновленное состояние
 */
function handleLocationTransition($state, $newLocation) {
    $oldLocation = $state['location'] ?? null;
    
    // Обновляем локацию
    $state['location'] = $newLocation;
    
    // Специальная обработка перехода в деревню после пролога
    if ($oldLocation === 'main' && $newLocation === 'village') {
        // Сбрасываем seenIds только для типа 'main'
        $state['seenIds'] = array_values(array_filter($state['seenIds'], function($id) {
            return strpos($id, 'main.') !== 0;
        }));
    }
    
    return $state;
}

/**
 * Находит начальное событие для локации
 * @param string $location Название локации
 * @return array|null Событие или null
 */
function findLocationEntryEvent($location) {
    // Проверяем возможные ID событий входа
    $possibleIds = [
        $location . '.gate.001',
        $location . '.entrance.001',
        $location . '.start.001',
        $location . '.001'
    ];
    
    foreach ($possibleIds as $id) {
        $event = findEventById($id);
        if ($event) {
            return $event;
        }
    }
    
    return null;
}

/**
 * Проверяет, является ли событие приоритетным (по частоте)
 * @param array $event Данные события
 * @param array $state Состояние игры
 * @return bool
 */
function isEventPriority($event, $state) {
    $rules = $event['data']['rules'] ?? [];
    $turn = $state['turn'] ?? 1;
    
    if (!isset($rules['frequency']) || $rules['frequency'] === null) {
        return false;
    }
    
    $frequency = $rules['frequency'];
    
    if ($frequency['kind'] === 'every_n_turns') {
        $n = $frequency['n'] ?? 1;
        return ($turn % $n) === 0;
    }
    
    if ($frequency['kind'] === 'random') {
        // Для случайной частоты проверяем диапазон
        $min = $frequency['min'] ?? 1;
        $max = $frequency['max'] ?? 10;
        // Простая логика: если прошло достаточно ходов в диапазоне
        $lastSeen = $state['lastSeen'][$event['id']] ?? 0;
        $elapsed = $turn - $lastSeen;
        return $elapsed >= $min && rng() < (1.0 / ($max - $min + 1));
    }
    
    return false;
}

/**
 * Проверяет, является ли событие обязательным (every_n_turns)
 * @param array $event Данные события
 * @param array $state Состояние игры
 * @return bool
 */
function isEventMandatory($event, $state) {
    $rules = $event['data']['rules'] ?? [];
    $turn = $state['turn'] ?? 1;
    $location = $state['location'] ?? null;
    
    // Проверяем только every_n_turns события
    if (!isset($rules['frequency']) || $rules['frequency'] === null) {
        return false;
    }
    
    $frequency = $rules['frequency'];
    
    if ($frequency['kind'] === 'every_n_turns') {
        $n = $frequency['n'] ?? 1;
        
        // Обязательно срабатывает каждые N ходов
        if ($turn > 0 && ($turn % $n) === 0) {
            // Дополнительная проверка локации если указана
            if (isset($rules['only_in_location']) && $rules['only_in_location'] !== null) {
                return $location === $rules['only_in_location'];
            }
            return true;
        }
    }
    
    return false;
}

/**
 * Выбирает случайное дочернее событие если нужно
 * @param array $event Базовое событие
 * @param array $state Состояние игры
 * @return array Событие (базовое или дочернее)
 */
function rollChildEvent($event, $state) {
    $rules = $event['data']['rules'] ?? [];
    
    if (!isset($rules['child_roll']) || $rules['child_roll'] === null) {
        return $event;
    }
    
    $childRoll = $rules['child_roll'];
    $chance = $childRoll['chance'] ?? 0.5;
    $pool = $childRoll['pool'] ?? [];
    
    if (empty($pool) || rng() >= $chance) {
        return $event;
    }
    
    // Выбираем случайное дочернее событие
    $childId = $pool[array_rand($pool)];
    $childEvent = findEventById($childId);
    
    return $childEvent ? $childEvent : $event;
}

/**
 * Получает безопасное дефолтное событие
 * @return array
 */
function getDefaultEvent() {
    // Сначала пытаемся найти idle событие
    $idleEvent = findEventById('shared.idle');
    if ($idleEvent) {
        return $idleEvent;
    }
    
    // Создаем дефолтное событие на лету
    return [
        'id' => 'default.idle',
        'path' => null,
        'type' => 'shared',
        'data' => [
            'id' => 'default.idle',
            'type' => 'shared',
            'title' => 'Скучный день',
            'text' => 'Ничего интересного не происходит. Время медленно течет...',
            'image' => null,
            'choices' => [
                [
                    'label' => 'Продолжить',
                    'next' => 'end'
                ]
            ],
            'effects' => [
                'hp' => 0,
                'damage' => 0,
                'fame' => 0,
                'gold' => 0,
                'items_add' => [],
                'items_remove' => []
            ],
            'rules' => [
                'frequency' => null,
                'chance' => null,
                'cooldown' => 0,
                'once' => false,
                'only_in_location' => null,
                'child_roll' => null
            ],
            'tags' => ['default', 'idle'],
            'version' => 1
        ],
        'filename' => 'default',
        'mtime' => time()
    ];
}

/**
 * Фильтрует события по типу/локации
 * @param array $events Все события
 * @param string|null $type Тип для фильтрации
 * @return array Отфильтрованные события
 */
function filterEventsByType($events, $type = null) {
    if ($type === null) {
        return $events;
    }
    
    return array_filter($events, function($event) use ($type) {
        return $event['type'] === $type;
    });
}

/**
 * Устанавливает заголовки для JSON ответа
 */
function setJsonHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST');
    header('Access-Control-Allow-Headers: Content-Type');
}

/**
 * Отправляет JSON ответ с ошибкой
 * @param string $message Сообщение об ошибке
 * @param int $code HTTP код ошибки
 */
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Отправляет успешный JSON ответ
 * @param mixed $data Данные для ответа
 */
function sendSuccess($data) {
    echo json_encode([
        'success' => true,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

/**
 * Сброс кэша (для разработки)
 */
function clearEventsCache() {
    global $EVENTS_CACHE;
    $EVENTS_CACHE = null;
}
?>
