class Game {
    constructor() {
        this.playerBoard = new Board();
        this.opponentBoard = new Board();
        this.currentPlayer = null;
        this.gameCode = null;
        this.player = null;
        this.ui = new UI(this);
        this.lastEventId = 0;
        this.isPolling = false;
        this.gameStarted = false;
        this.shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]; // Размеры кораблей
        this.totalShipCells = this.shipSizes.reduce((a, b) => a + b, 0); // Общее количество клеток кораблей
        this.sunkShipCells = {1: 0, 2: 0}; // Счетчик потопленных клеток кораблей для каждого игрока
    }

    async createGame() {
        try {
            const response = await API.createGame();
            if (response.success) {
                this.gameCode = response.gameCode;
                this.player = 1;
                this.playerBoard.grid = response.player1Board;
                this.opponentBoard.clear();
                return this.gameCode;
            } else {
                this.ui.showError('Failed to create game');
            }
        } catch (error) {
            console.error('Error creating game:', error);
            this.ui.showError('Error creating game');
        }
        return null;
    }

    async joinGame(code) {
        try {
            const response = await API.joinGame(code);
            if (response.success) {
                this.gameCode = code;
                this.player = 2;
                this.playerBoard.grid = response.player2Board;
                this.opponentBoard.clear();
                await this.startGame();
            } else {
                this.ui.showError(response.message || 'Failed to join game');
            }
        } catch (error) {
            console.error('Error joining game:', error);
            this.ui.showError('Error joining game');
        }
    }

    setOpponentBoard(board) {
        this.opponentBoard.grid = board;
        this.ui.renderBoards();
    }

    async waitForOpponent() {
        this.ui.showWaitingScreen(this.gameCode);
        while (!this.gameStarted) {
            try {
                const data = await this.getGameState();
                if (data.status === 'active') {
                    this.startGame();
                    break;
                }
            } catch (error) {
                console.error('Error while waiting for opponent:', error);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async startGame() {
        this.gameStarted = true;
        this.currentPlayer = 1;
    
        this.ui.hideWaitingScreen();
        this.ui.updateGameScreen();
        this.ui.renderBoards();
        
        this.updateTurnInfo();
        this.startLongPolling();
    }

    updateTurnInfo() {
        const isPlayerTurn = this.currentPlayer === this.player;
        this.ui.updateTurnInfo(isPlayerTurn);
    }

    async makeMove(x, y) {
        if (this.currentPlayer !== this.player) {
            console.log('Не ваш ход');
            return;
        }

        if (this.opponentBoard.grid[y][x] !== null && this.opponentBoard.grid[y][x] !== 'ship') {
            // Клетка уже была атакована, просто игнорируем
            return;
        }

        try {
            const response = await API.makeMove(this.gameCode, this.player, x, y);
            if (response.success) {
                this.handleMoveResult(this.player, x, y, response.result);
                this.currentPlayer = response.newPlayer;
                this.updateTurnInfo();
            } else {
                console.error(response.message);
            }
        } catch (error) {
            console.error('Error making move:', error);
            this.ui.showError('Error making move');
        }
    }

    handleMoveEvent(eventData) {
        const { player, x, y, result, newPlayer } = eventData;
        this.handleMoveResult(parseInt(player), parseInt(x), parseInt(y), result);
        this.currentPlayer = parseInt(newPlayer);
        this.updateTurnInfo();
    }

    handleMoveResult(player, x, y, result) {
        const board = player === this.player ? this.opponentBoard : this.playerBoard;
        
        const previousState = board.grid[y][x];
        board.updateCell(x, y, result);
        this.ui.updateCellDisplay(board, x, y, result);
    
        if (result === 'hit' && previousState !== 'hit') {
            this.sunkShipCells[player]++;
        } else if (result === 'sunk') {
            const sunkCells = board.markSunkShipArea(x, y);
            const newSunkCells = sunkCells.filter(([sx, sy]) => board.grid[sy][sx] !== 'sunk').length;
            this.sunkShipCells[player] += newSunkCells;
            
            sunkCells.forEach(([sx, sy]) => {
                board.updateCell(sx, sy, 'sunk');
                this.ui.updateCellDisplay(board, sx, sy, 'sunk');
            });
            
            // Обновляем клетки вокруг потопленного корабля
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < board.size && ny >= 0 && ny < board.size && board.grid[ny][nx] === null) {
                        board.updateCell(nx, ny, 'miss');
                        this.ui.updateCellDisplay(board, nx, ny, 'miss');
                    }
                }
            }
        }
    
        if (this.sunkShipCells[player] >= this.totalShipCells) {
            this.endGame(player);
        }
        
        this.ui.renderBoards();
    }

    markSunkShipArea(board, x, y) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const shipCells = [];
        const visited = new Set();
        
        const checkCell = (x, y) => {
            const key = `${x},${y}`;
            if (visited.has(key)) return;
            visited.add(key);
            
            if (x >= 0 && x < board.size && y >= 0 && y < board.size && (board.grid[y][x] === 'hit' || board.grid[y][x] === 'sunk')) {
                shipCells.push([x, y]);
                board.grid[y][x] = 'sunk';
                this.ui.updateCell(board, x, y, 'sunk');
                directions.forEach(([dx, dy]) => checkCell(x + dx, y + dy));
            }
        };
    
        checkCell(x, y);
    
        shipCells.forEach(([sx, sy]) => {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = sx + dx;
                    const ny = sy + dy;
                    if (nx >= 0 && nx < board.size && ny >= 0 && ny < board.size && board.grid[ny][nx] === null) {
                        board.grid[ny][nx] = 'miss';
                        this.ui.updateCell(board, nx, ny, 'miss');
                    }
                }
            }
        });
    }

    async getGameState() {
        try {
            const response = await API.getGameState(this.gameCode, this.lastEventId);
            if (response.success && response.state) {
                this.lastEventId = response.state.lastEventId;
                if (Array.isArray(response.state.events)) {
                    this.handleEvents(response.state.events);
                }
                return response.state;
            }
        } catch (error) {
            console.error('Error getting game state:', error);
        }
        return null;
    }

    async startLongPolling() {
        this.isPolling = true;
        while (this.isPolling) {
            try {
                await this.getGameState();
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Long polling error:', error);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    handleEvents(events) {
        if (!Array.isArray(events)) {
            console.error('Events is not an array:', events);
            return;
        }
        for (const event of events) {
            try {
                const eventData = typeof event.event_data === 'string' ? JSON.parse(event.event_data) : event.event_data;
                switch (event.event_type) {
                    case 'gameStart':
                        this.handleGameStartEvent(eventData);
                        break;
                    case 'move':
                        this.handleMoveEvent(eventData);
                        break;
                    case 'turnChange':
                        this.handleTurnChangeEvent(eventData);
                        break;
                    case 'gameOver':
                        this.handleGameOverEvent(eventData);
                        break;
                }
            } catch (error) {
                console.error('Error handling event:', error, event);
            }
        }
    }

    handleGameStartEvent(eventData) {
        if (!this.gameStarted) {
            this.startGame();
        }
    }

    handleTurnChangeEvent(eventData) {
        this.currentPlayer = eventData.currentPlayer;
        this.updateTurnInfo();
    }

    handleGameOverEvent(eventData) {
        const winner = eventData.winner;
        this.endGame(winner);
    }

    checkGameOver(board) {
        for (let y = 0; y < board.size; y++) {
            for (let x = 0; x < board.size; x++) {
                if (board.grid[y][x] === 'ship') {
                    return false; // Найден живой корабль
                }
            }
        }
        return true; // Все корабли уничтожены
    }

    endGame(winner) {
        this.isPolling = false;
        const isWinner = winner === this.player;
        this.ui.showEndScreen(isWinner);
        
        // Отправляем событие окончания игры на сервер
        API.endGame(this.gameCode);
    }
}