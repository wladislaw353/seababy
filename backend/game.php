<?php
class Game {
    private $db;

    public function __construct() {
        $this->db = new Database();
    }

    public function createGame() {
        $gameCode = $this->generateGameCode();
        $player1Board = $this->generateRandomBoard();
        $player2Board = $this->generateRandomBoard();
        $this->db->query("INSERT INTO games (game_code, status, player1_board, player2_board, current_player) VALUES (?, 'waiting', ?, ?, 1)", 
                         [$gameCode, json_encode($player1Board), json_encode($player2Board)]);
        return ['success' => true, 'gameCode' => $gameCode, 'player1Board' => $player1Board];
    }

    public function joinGame($gameCode) {
        $game = $this->db->query("SELECT * FROM games WHERE game_code = ?", [$gameCode])->fetch();
        if ($game && $game['status'] === 'waiting') {
            $this->db->query("UPDATE games SET status = 'active' WHERE game_code = ?", [$gameCode]);
            $this->addEvent($game['id'], 'gameStart', json_encode(['message' => 'Game started']));
            
            // Отправляем доску противника первому игроку
            $this->addEvent($game['id'], 'opponentBoard', json_encode([
                'player' => 1,
                'board' => json_decode($game['player2_board'], true)
            ]));
            
            // Отправляем доску противника второму игроку
            $this->addEvent($game['id'], 'opponentBoard', json_encode([
                'player' => 2,
                'board' => json_decode($game['player1_board'], true)
            ]));
            
            return [
                'success' => true, 
                'message' => 'Joined successfully', 
                'player2Board' => json_decode($game['player2_board'], true)
            ];
        } elseif ($game && $game['status'] === 'active') {
            return ['success' => false, 'message' => 'Игра уже началась'];
        } else {
            return ['success' => false, 'message' => 'Игровая комната не найдена'];
        }
    }

    public function getGameState($gameCode, $lastEventId) {
        $game = $this->db->query("SELECT * FROM games WHERE game_code = ?", [$gameCode])->fetch();
        if (!$game) {
            return ['success' => false, 'message' => 'Игровая комната не найдена'];
        }
        
        $events = $this->db->query("SELECT id, event_type, event_data FROM game_events WHERE game_id = ? AND id > ? ORDER BY id ASC", 
                                   [$game['id'], $lastEventId])->fetchAll(PDO::FETCH_ASSOC);
        
        $lastEventId = count($events) > 0 ? $events[count($events) - 1]['id'] : $lastEventId;

        return [
            'status' => $game['status'],
            'currentPlayer' => $game['current_player'],
            'events' => $events,
            'lastEventId' => $lastEventId
        ];
    }

    public function makeMove($gameCode, $player, $x, $y) {
        $game = $this->db->query("SELECT * FROM games WHERE game_code = ?", [$gameCode])->fetch();
        if (!$game || $game['status'] !== 'active' || $game['current_player'] != $player) {
            return ['success' => false, 'message' => 'Invalid move'];
        }
    
        $opponentBoard = $player == 1 ? json_decode($game['player2_board'], true) : json_decode($game['player1_board'], true);
        
        if ($opponentBoard[$y][$x] === null) {
            $result = 'miss';
        } elseif ($opponentBoard[$y][$x] === 'ship') {
            $result = 'hit';
            $opponentBoard[$y][$x] = 'hit';
            if ($this->checkShipSunk($opponentBoard, $x, $y)) {
                $result = 'sunk';
                $this->markSunkShip($opponentBoard, $x, $y);
            }
        } elseif ($opponentBoard[$y][$x] === 'hit') {
            // Если клетка уже была подбита, проверяем, не потоплен ли корабль теперь
            if ($this->checkShipSunk($opponentBoard, $x, $y)) {
                $result = 'sunk';
                $this->markSunkShip($opponentBoard, $x, $y);
            } else {
                $result = 'hit';
            }
        } else {
            return ['success' => false, 'message' => 'Invalid move'];
        }
    
        $updatedBoard = $player == 1 ? 'player2_board' : 'player1_board';
        $this->db->query("UPDATE games SET $updatedBoard = ? WHERE id = ?", 
                         [json_encode($opponentBoard), $game['id']]);
    
        $newPlayer = ($result === 'miss') ? 3 - $player : $player;
        $this->db->query("UPDATE games SET current_player = ? WHERE id = ?", [$newPlayer, $game['id']]);
    
        $this->addEvent($game['id'], 'move', json_encode([
            'player' => $player,
            'x' => $x,
            'y' => $y,
            'result' => $result,
            'newPlayer' => $newPlayer,
            'opponentBoard' => $opponentBoard
        ]));
    
        return ['success' => true, 'result' => $result, 'newPlayer' => $newPlayer];
    }
    
    private function markSunkShip(&$board, $x, $y) {
        $directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        $shipCells = [];
        $visited = [];
    
        $stack = [[$x, $y]];
        while (!empty($stack)) {
            list($cx, $cy) = array_pop($stack);
            if (isset($visited["$cx,$cy"])) continue;
            $visited["$cx,$cy"] = true;
    
            if ($board[$cy][$cx] === 'hit' || $board[$cy][$cx] === 'ship') {
                $shipCells[] = [$cx, $cy];
                $board[$cy][$cx] = 'sunk';
                foreach ($directions as $dir) {
                    $nx = $cx + $dir[0];
                    $ny = $cy + $dir[1];
                    if ($nx >= 0 && $nx < 10 && $ny >= 0 && $ny < 10) {
                        $stack[] = [$nx, $ny];
                    }
                }
            }
        }
    
        // Mark surrounding cells as 'miss'
        foreach ($shipCells as $cell) {
            list($sx, $sy) = $cell;
            for ($dx = -1; $dx <= 1; $dx++) {
                for ($dy = -1; $dy <= 1; $dy++) {
                    $nx = $sx + $dx;
                    $ny = $sy + $dy;
                    if ($nx >= 0 && $nx < 10 && $ny >= 0 && $ny < 10 && ($board[$ny][$nx] === null || $board[$ny][$nx] === 'ship')) {
                        $board[$ny][$nx] = 'miss';
                    }
                }
            }
        }
    }

    private function checkShipSunk($board, $x, $y) {
        $directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        $stack = [[$x, $y]];
        $visited = [];
    
        while (!empty($stack)) {
            list($cx, $cy) = array_pop($stack);
            $key = "$cx,$cy";
            if (isset($visited[$key])) continue;
            $visited[$key] = true;
    
            if ($board[$cy][$cx] === 'ship') {
                return false; // Найдена неподбитая часть корабля
            }
    
            if ($board[$cy][$cx] === 'hit') {
                foreach ($directions as $dir) {
                    $nx = $cx + $dir[0];
                    $ny = $cy + $dir[1];
                    if ($nx >= 0 && $nx < 10 && $ny >= 0 && $ny < 10 && !isset($visited["$nx,$ny"])) {
                        $stack[] = [$nx, $ny];
                    }
                }
            }
        }
    
        return true; // Все части корабля подбиты
    }

    public function endGame($gameCode) {
        $game = $this->db->query("SELECT * FROM games WHERE game_code = ?", [$gameCode])->fetch();
        if (!$game) {
            return ['success' => false, 'message' => 'Игровая комната не найдена'];
        }
    
        if ($game['status'] === 'finished') {
            return ['success' => true, 'message' => 'Игра завершена'];
        }
    
        $this->db->query("UPDATE games SET status = 'finished' WHERE id = ?", [$game['id']]);
        
        $this->addEvent($game['id'], 'gameOver', json_encode([
            'message' => 'Игра завершена'
        ]));
    
        return ['success' => true, 'message' => 'Игра завершена'];
    }

    private function generateRandomBoard() {
        $board = array_fill(0, 10, array_fill(0, 10, null));
        $ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

        foreach ($ships as $size) {
            $placed = false;
            while (!$placed) {
                $x = rand(0, 9);
                $y = rand(0, 9);
                $horizontal = (bool)rand(0, 1);

                if ($this->canPlaceShip($board, $x, $y, $size, $horizontal)) {
                    $this->placeShip($board, $x, $y, $size, $horizontal);
                    $placed = true;
                }
            }
        }

        return $board;
    }

    private function canPlaceShip($board, $x, $y, $size, $horizontal) {
        for ($i = 0; $i < $size; $i++) {
            $checkX = $horizontal ? $x + $i : $x;
            $checkY = $horizontal ? $y : $y + $i;

            if ($checkX >= 10 || $checkY >= 10 || $board[$checkY][$checkX] !== null) {
                return false;
            }

            for ($dx = -1; $dx <= 1; $dx++) {
                for ($dy = -1; $dy <= 1; $dy++) {
                    $surroundX = $checkX + $dx;
                    $surroundY = $checkY + $dy;
                    if ($surroundX >= 0 && $surroundX < 10 && $surroundY >= 0 && $surroundY < 10) {
                        if ($board[$surroundY][$surroundX] !== null) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }

    private function placeShip(&$board, $x, $y, $size, $horizontal) {
        for ($i = 0; $i < $size; $i++) {
            $placeX = $horizontal ? $x + $i : $x;
            $placeY = $horizontal ? $y : $y + $i;
            $board[$placeY][$placeX] = 'ship';
        }
    }

    private function generateGameCode() {
        return substr(str_shuffle(str_repeat('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5)), 0, 6);
    }

    private function addEvent($gameId, $type, $data) {
        $this->db->query("INSERT INTO game_events (game_id, event_type, event_data) VALUES (?, ?, ?)",
                         [$gameId, $type, $data]);
    }
}