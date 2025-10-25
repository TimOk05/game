<?php
/**
 * Утилита для тестирования API
 * GET /api/test.php
 */

require_once 'common.php';

setJsonHeaders();

try {
    echo "<h1>API Test</h1>";
    echo "<h2>Events Scan</h2>";
    
    $events = scanEvents();
    echo "<p>Total events found: " . count($events) . "</p>";
    
    echo "<h3>Events by type:</h3>";
    $byType = [];
    foreach ($events as $event) {
        $type = $event['type'];
        if (!isset($byType[$type])) {
            $byType[$type] = 0;
        }
        $byType[$type]++;
    }
    
    foreach ($byType as $type => $count) {
        echo "<p><strong>{$type}:</strong> {$count} events</p>";
    }
    
    echo "<h3>Sample Events:</h3>";
    $i = 0;
    foreach ($events as $event) {
        if ($i >= 5) break;
        echo "<p><strong>{$event['id']}</strong> ({$event['type']}) - {$event['data']['title'] ?? 'No title'}</p>";
        $i++;
    }
    
    echo "<h2>Test State</h2>";
    $testState = [
        'location' => 'village',
        'turn' => 1,
        'seenIds' => [],
        'cooldowns' => [],
        'stats' => [
            'hp' => 100,
            'damage' => 0,
            'fame' => 0,
            'gold' => 10,
            'items' => []
        ]
    ];
    
    echo "<pre>" . json_encode($testState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    
    echo "<h2>Next Event Simulation</h2>";
    
    // Симулируем вызов next API
    $locationEvents = filterEventsByType($events, 'village');
    $sharedEvents = filterEventsByType($events, 'shared');
    $availableEvents = array_merge($locationEvents, $sharedEvents);
    
    echo "<p>Available events for location 'village': " . count($availableEvents) . "</p>";
    
    foreach ($availableEvents as $event) {
        $available = isEventAvailable($event, $testState);
        $priority = isEventPriority($event, $testState);
        echo "<p><strong>{$event['id']}</strong> - Available: " . ($available ? 'Yes' : 'No') . 
             ", Priority: " . ($priority ? 'Yes' : 'No') . "</p>";
    }
    
} catch (Exception $e) {
    echo "<p>Error: " . $e->getMessage() . "</p>";
    error_log("Test API error: " . $e->getMessage());
}
?>
