<?php
/**
 * API endpoint для получения конкретного события
 * GET /api/get.php?id=event_id
 */

require_once 'common.php';

setJsonHeaders();

try {
    // Получаем ID события
    $id = $_GET['id'] ?? '';
    
    if (empty($id)) {
        sendError('ID parameter is required');
    }
    
    // Проверяем безопасность ID
    if (!preg_match('/^[a-zA-Z0-9._-]+$/', $id)) {
        sendError('Invalid ID format');
    }
    
    // Ищем событие
    $event = findEventById($id);
    
    if (!$event) {
        sendError('Event not found', 404);
    }
    
    // Проверяем версию схемы
    $version = $event['data']['version'] ?? 0;
    if ($version < 1) {
        sendError('Unsupported event schema version: ' . $version, 400);
    }
    
    // Подготавливаем полный ответ
    $eventData = $event['data'];
    $eventData['meta'] = [
        'id' => $event['id'],
        'path' => $event['path'],
        'type' => $event['type'],
        'filename' => $event['filename'],
        'last_modified' => $event['mtime'],
        'last_modified_iso' => date('c', $event['mtime']),
        'schema_version' => $version,
        'file_size' => file_exists($event['path']) ? filesize($event['path']) : 0
    ];
    
    sendSuccess($eventData);
    
} catch (Exception $e) {
    error_log("Get API error: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
}
?>