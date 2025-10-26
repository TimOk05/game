<?php
/**
 * API endpoint для получения списка событий
 * GET /api/list.php?type=village|main (опционально)
 */

require_once 'common.php';

setJsonHeaders();

try {
    // Получаем параметр типа
    $type = $_GET['type'] ?? null;
    
    // Валидация типа если указан
    if ($type !== null) {
        $allowedTypes = ['main', 'village', 'shared'];
        if (!in_array($type, $allowedTypes)) {
            sendError('Invalid type parameter. Allowed: ' . implode(', ', $allowedTypes));
        }
    }
    
    // Сканируем все события
    $allEvents = scanEvents();
    
    // Фильтруем по типу если нужно
    $filteredEvents = filterEventsByType($allEvents, $type);
    
    // Подготавливаем ответ
    $result = [];
    foreach ($filteredEvents as $event) {
        $result[] = [
            'id' => $event['id'],
            'path' => $event['path'],
            'type' => $event['type'],
            'title' => $event['data']['title'] ?? 'Untitled',
            'filename' => $event['filename'],
            'tags' => $event['data']['tags'] ?? [],
            'rules' => [
                'once' => $event['data']['rules']['once'] ?? false,
                'chance' => $event['data']['rules']['chance'] ?? null,
                'only_in_location' => $event['data']['rules']['only_in_location'] ?? null,
                'frequency' => $event['data']['rules']['frequency'] ?? null
            ]
        ];
    }
    
    // Сортируем по ID для стабильности
    usort($result, function($a, $b) {
        return strcmp($a['id'], $b['id']);
    });
    
    sendSuccess([
        'events' => $result,
        'count' => count($result),
        'filter' => [
            'type' => $type
        ],
        'total_scanned' => count($allEvents)
    ]);
    
} catch (Exception $e) {
    error_log("List API error: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
}
?>