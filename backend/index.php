<?php
header('Content-Type: application/json');

require_once 'game.php';
require_once 'database.php';

$action = $_POST['action'] ?? '';
$game = new Game();

try {
    switch ($action) {
        case 'create':
            $result = $game->createGame();
            echo json_encode($result);
            break;

        case 'join':
            $gameCode = $_POST['gameCode'] ?? '';
            $result = $game->joinGame($gameCode);
            echo json_encode($result);
            break;

        case 'getState':
            $gameCode = $_POST['gameCode'] ?? '';
            $lastEventId = $_POST['lastEventId'] ?? 0;
            $state = $game->getGameState($gameCode, $lastEventId);
            echo json_encode(['success' => true, 'state' => $state]);
            break;

        case 'makeMove':
            $gameCode = $_POST['gameCode'] ?? '';
            $player = $_POST['player'] ?? '';
            $x = $_POST['x'] ?? '';
            $y = $_POST['y'] ?? '';
            $result = $game->makeMove($gameCode, $player, $x, $y);
            echo json_encode($result);
            break;

        case 'endGame':
            $gameCode = $_POST['gameCode'] ?? '';
            $result = $game->endGame($gameCode);
            echo json_encode(['success' => $result]);
            break;

        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    error_log('Error in index.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again later.']);
}