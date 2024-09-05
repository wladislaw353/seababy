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
    }

    async createGame() {
        try {
            const response = await API.createGame();
            if (response.success) {
                this.gameCode = response.gameCode;
                this.player = 1;
                this.playerBoard.grid = response.player1Board;
                this.ui.showGameCode(this.gameCode);
                await this.waitForOpponent();
            } else {
                this.ui.showError('Failed to create game');
            }
        } catch (error) {
            console.error('Error creating game:', error);
            this.ui.showError('Error creating game');
        }
    }

    async joinGame(code) {
        try {
            const response = await API.joinGame(code);
            if (response.success) {
                this.gameCode = code;
                this.player = 2;
                this.playerBoard.grid = response.player2Board;
                console.log('Successfully joined game, starting...');
                await this.startGame();
            } else {
                this.ui.showError(response.message || 'Failed to join game');
            }
        } catch (error) {
            console.error('Error joining game:', error);
            this.ui.showError('Error joining game');
        }
    }

    async waitForOpponent() {
        this.ui.showWaitingScreen();
        console.log('Waiting for opponent...');
        while (!this.gameStarted) {
            try {
                const data = await this.getGameState();
                if (data.status === 'active') {
                    console.log('Game is active, starting the game');
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
        console.log('Starting the game');
        console.log('Player:', this.player);
        
        this.gameStarted = true;
        this.playerBoard.randomizeShips();
        this.opponentBoard.clear();
        this.currentPlayer = 1; // Всегда начинает первый игрок
        console.log('Current player:', this.currentPlayer);

        this.ui.hideWaitingScreen();
        this.ui.updateGameScreen();
        this.ui.renderBoards();
        
        this.updateTurnInfo();
        this.startLongPolling();
    }

    updateTurnInfo() {
        const isPlayerTurn = this.currentPlayer === this.player;
        console.log('Updating turn info. Current player:', this.currentPlayer, 'This player:', this.player);
        this.ui.updateTurnInfo(isPlayerTurn);
    }

    async makeMove(x, y) {
        if (this.currentPlayer !== this.player) {
            console.log('Не ваш ход');
            return;
        }
    
        try {
            const response = await API.makeMove(this.gameCode, this.player, x, y);
            if (response.success) {
                console.log('Move result:', response);
                this.handleMoveResult(response.result, x, y, this.opponentBoard);
                this.currentPlayer = response.newPlayer;
                this.updateTurnInfo();
                this.ui.renderBoards();
            } else {
                this.ui.showError(response.message || 'Error making move');
            }
        } catch (error) {
            console.error('Error making move:', error);
            this.ui.showError('Error making move');
        }
    }

    handleMoveResult(result, x, y, board) {
        console.log('Updating board:', result, x, y, board);
        if (board && board.updateCell) {
            board.updateCell(x, y, result);
            this.ui.updateCell(board, x, y, result);
            if (result === 'sunk') {
                this.markSunkShipArea(board, x, y);
            }
        } else {
            console.error('Invalid board in handleMoveResult');
        }
    }

    markSunkShipArea(board, x, y) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const shipCells = [];
        
        const checkCell = (x, y) => {
            if (x >= 0 && x < board.size && y >= 0 && y < board.size && (board.grid[y][x] === 'hit' || board.grid[y][x] === 'sunk')) {
                shipCells.push([x, y]);
                board.grid[y][x] = 'sunk';
                this.ui.updateCell(board, x, y, 'sunk');
                return true;
            }
            return false;
        };
    
        const stack = [[x, y]];
        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            if (checkCell(cx, cy)) {
                directions.forEach(([dx, dy]) => {
                    stack.push([cx + dx, cy + dy]);
                });
            }
        }
    
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
        console.log('Handling events:', events);
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
                    default:
                        console.warn('Unknown event type:', event.event_type);
                }
            } catch (error) {
                console.error('Error handling event:', error, event);
            }
        }
    }

    handleGameStartEvent(eventData) {
        console.log('Handling gameStart event');
        if (!this.gameStarted) {
            this.startGame();
        }
    }

    handleMoveEvent(eventData) {
        console.log('Handling move event:', eventData);
        const { player, x, y, result, newPlayer } = eventData;
        const boardToUpdate = parseInt(player) !== this.player ? this.playerBoard : this.opponentBoard;
        
        this.handleMoveResult(result, parseInt(x), parseInt(y), boardToUpdate);
        this.currentPlayer = parseInt(newPlayer);
        this.updateTurnInfo();
        this.ui.renderBoards();
    }

    handleTurnChangeEvent(eventData) {
        this.currentPlayer = eventData.currentPlayer;
        this.updateTurnInfo();
    }

    handleGameOverEvent(eventData) {
        const winner = eventData.winner;
        this.endGame(winner);
    }

    endGame(winner) {
        this.isPolling = false;
        this.ui.showEndScreen(winner === this.player);
    }
}