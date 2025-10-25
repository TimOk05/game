<?php
/**
 * API endpoint для получения следующего события
 * POST /api/next.php
 * Body: { "state": { location, turn, seenIds, cooldowns, stats } }
 */

require_once 'common.php';

setJsonHeaders();

    // Применяем случайные эффекты для дочерних событий
    function applyRandomEffects($eventData, $state = null) {
        $eventId = $eventData['id'] ?? '';
        
        // Специальные эффекты для событий таверны
        if (strpos($eventId, 'village.tavern.') === 0) {
            $effects = $eventData['effects'] ?? [];
            
            // Drink tournament: случайный HP от -2 до +4, -1 золото
            if (strpos($eventId, 'drink_tournament') !== false) {
                $effects['hp'] = 'random:-2,4';
                $effects['gold'] = -1;
            }
            
            // Gambling: 50% шанс удвоить ставку или потерять
            if (strpos($eventId, 'gambling') !== false) {
                $effects['gold'] = 'chance:0.5,+6,-3'; // Предполагаем ставку 3 золота
            }
            
            // Fight: боевой урон с учетом damage
            if (strpos($eventId, 'fight') !== false) {
                $effects['hp'] = 'combat:-4'; // Базовый урон -4 + бонус от damage
            }
            
            $eventData['effects'] = $effects;
        }
        
        return $eventData;
    }
    
    // Обработка боевых эффектов с учетом damage
    function processCombatEffect($value, $damage) {
        if (is_string($value) && strpos($value, 'combat:') === 0) {
            $baseDamage = intval(substr($value, 7)); // Извлекаем базовый урон
            
            // Бонус от damage: clamp(damageBonus, -2..+2)
            $damageBonus = max(-2, min(2, $damage));
            
            return $baseDamage + $damageBonus;
        }
        
        return $value;
    }

try {
    // Получаем входные данные
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input === null) {
        sendError('Invalid JSON input');
    }
    
    if (!isset($input['state'])) {
        sendError('State parameter is required');
    }
    
    $state = $input['state'];
    
    // Валидация состояния
    $location = $state['location'] ?? null;
    $turn = intval($state['turn'] ?? 1);
    $seenIds = $state['seenIds'] ?? [];
    $cooldowns = $state['cooldowns'] ?? [];
    $stats = $state['stats'] ?? [
        'hp' => 100,
        'damage' => 0,
        'fame' => 0,
        'gold' => 10,
        'items' => []
    ];
    
    // Подготавливаем нормализованное состояние
    $normalizedState = [
        'location' => $location,
        'turn' => $turn,
        'seenIds' => $seenIds,
        'cooldowns' => $cooldowns,
        'stats' => $stats,
        'lastSeen' => $state['lastSeen'] ?? []
    ];
    
    // Сканируем все события
    $allEvents = scanEvents();
    
    // Фильтруем по локации если указана
    $locationEvents = [];
    if ($location) {
        $locationEvents = filterEventsByType($allEvents, $location);
        // Добавляем shared события
        $sharedEvents = filterEventsByType($allEvents, 'shared');
        $locationEvents = array_merge($locationEvents, $sharedEvents);
    } else {
        $locationEvents = $allEvents;
    }
    
    // Этап 1: Ищем обязательные события (every_n_turns)
    $mandatoryEvents = [];
    foreach ($locationEvents as $event) {
        if (isEventAvailable($event, $normalizedState) && isEventMandatory($event, $normalizedState)) {
            $mandatoryEvents[] = $event;
        }
    }
    
    // Этап 1.5: Ищем обычные приоритетные события (по частоте)
    $priorityEvents = [];
    foreach ($locationEvents as $event) {
        if (isEventAvailable($event, $normalizedState) && isEventPriority($event, $normalizedState)) {
            $priorityEvents[] = $event;
        }
    }
    
    $selectedEvent = null;
    
    // Если есть обязательные события, выбираем из них
    if (!empty($mandatoryEvents)) {
        $selectedEvent = $mandatoryEvents[array_rand($mandatoryEvents)];
    } else if (!empty($priorityEvents)) {
        // Если нет обязательных, выбираем из приоритетных
        $selectedEvent = $priorityEvents[array_rand($priorityEvents)];
    } else {
        // Этап 2: Собираем доступные события
        $availableEvents = [];
        foreach ($locationEvents as $event) {
            if (isEventAvailable($event, $normalizedState)) {
                $availableEvents[] = $event;
            }
        }
        
        // Если есть доступные события, выбираем случайно
        if (!empty($availableEvents)) {
            $selectedEvent = $availableEvents[array_rand($availableEvents)];
        }
    }
    
    // Если нет доступных событий, берем дефолтное
    if (!$selectedEvent) {
        $selectedEvent = getDefaultEvent();
    }
    
    // Этап 3: Проверяем child_roll для выбранного события
    $finalEvent = $selectedEvent;
    $wasChildRoll = false;
    
    if ($selectedEvent && isset($selectedEvent['data']['rules']['child_roll'])) {
        $childRoll = $selectedEvent['data']['rules']['child_roll'];
        $chance = $childRoll['chance'] ?? 0.5;
        $pool = $childRoll['pool'] ?? [];
        
        if (!empty($pool) && rng() < $chance) {
            // Выбираем случайное дочернее событие
            $childId = $pool[array_rand($pool)];
            $childEvent = findEventById($childId);
            
            if ($childEvent) {
                $finalEvent = $childEvent;
                $wasChildRoll = true;
            }
        }
    }
    
    // Подготавливаем ответ с применением случайных эффектов
    $eventData = applyRandomEffects($finalEvent['data'], $normalizedState);
    
    // Обрабатываем боевые эффекты с учетом damage
    if (isset($eventData['effects']['hp']) && is_string($eventData['effects']['hp'])) {
        $damage = $normalizedState['stats']['damage'] ?? 0;
        $eventData['effects']['hp'] = processCombatEffect($eventData['effects']['hp'], $damage);
    }
    
    // Добавляем метаданные выбора
    $eventData['meta'] = [
        'selected_from' => count($locationEvents),
        'available_count' => isset($availableEvents) ? count($availableEvents) : 0,
        'priority_count' => count($priorityEvents),
        'was_mandatory' => !empty($mandatoryEvents),
        'was_priority' => !empty($priorityEvents),
        'was_child_roll' => $wasChildRoll,
        'original_event_id' => $selectedEvent ? $selectedEvent['id'] : null,
        'child_event_id' => $wasChildRoll ? $finalEvent['id'] : null,
        'turn' => $turn,
        'location' => $location,
        'selection_method' => !empty($mandatoryEvents) ? 'mandatory' : 
                            (!empty($priorityEvents) ? 'priority' : 
                            (!empty($availableEvents) ? 'random' : 'default'))
    ];
    
    // Обновляем состояние для следующего хода
    $updatedState = $normalizedState;
    $updatedState['turn'] = $turn + 1;
    
    // Добавляем ID в seen если это не дефолтное событие
    if ($finalEvent['id'] !== 'default.idle') {
        if (!in_array($finalEvent['id'], $updatedState['seenIds'])) {
            $updatedState['seenIds'][] = $finalEvent['id'];
        }
        $updatedState['lastSeen'][$finalEvent['id']] = $turn;
    }
    
    // Обновляем кулдауны
    foreach ($updatedState['cooldowns'] as $id => $turnsLeft) {
        if ($turnsLeft > 0) {
            $updatedState['cooldowns'][$id] = $turnsLeft - 1;
        } else {
            unset($updatedState['cooldowns'][$id]);
        }
    }
    
    // Устанавливаем кулдаун для базового события (родителя) если нужно
    if ($selectedEvent && isset($selectedEvent['data']['rules']['cooldown'])) {
        $parentCooldown = $selectedEvent['data']['rules']['cooldown'];
        if ($parentCooldown > 0) {
            $updatedState['cooldowns'][$selectedEvent['id']] = $parentCooldown;
        }
    }
    
    sendSuccess([
        'event' => $eventData,
        'state' => $updatedState
    ]);
    
} catch (Exception $e) {
    error_log("Next API error: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
}
?>