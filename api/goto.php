<?php
/**
 * API endpoint для обработки переходов между локациями
 * POST /api/goto.php
 * Body: { "state": {...}, "location": "village" }
 */

require_once 'common.php';

setJsonHeaders();

try {
    // Получаем входные данные
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input === null) {
        sendError('Invalid JSON input');
    }
    
    if (!isset($input['state'])) {
        sendError('State parameter is required');
    }
    
    if (!isset($input['location'])) {
        sendError('Location parameter is required');
    }
    
    $state = $input['state'];
    $newLocation = $input['location'];
    
    // Валидация новой локации
    $allowedLocations = ['main', 'village', 'forest', 'shared'];
    if (!in_array($newLocation, $allowedLocations)) {
        sendError('Invalid location: ' . $newLocation);
    }
    
    // Обрабатываем переход
    $updatedState = handleLocationTransition($state, $newLocation);
    
    // Ищем событие входа в новую локацию
    $entryEvent = findLocationEntryEvent($newLocation);
    
    if (!$entryEvent) {
        // Если нет специального события входа, возвращаем дефолтное
        $entryEvent = getDefaultEvent();
        $entryEvent['data']['title'] = 'Прибытие в ' . $newLocation;
        $entryEvent['data']['text'] = 'Вы прибыли в новую локацию: ' . $newLocation;
    }
    
    // Добавляем метаданные
    $entryEvent['data']['meta'] = [
        'location_transition' => true,
        'from_location' => $state['location'] ?? 'unknown',
        'to_location' => $newLocation,
        'turn' => $updatedState['turn'],
        'filename' => $entryEvent['filename'] ?? null
    ];
    
    sendSuccess([
        'event' => $entryEvent['data'],
        'state' => $updatedState
    ]);
    
} catch (Exception $e) {
    error_log("Goto API error: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
}
?>
