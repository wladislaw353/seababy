class UI {
    constructor(game) {
        this.game = game;
        this.startScreen = document.getElementById('start-screen');
        this.waitingScreen = document.getElementById('waiting-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.endScreen = document.getElementById('end-screen');
        this.playerBoard = document.getElementById('player-board');
        this.opponentBoard = document.getElementById('opponent-board');
        this.turnInfo = document.getElementById('turn-info');
        this.turnArrow = document.getElementById('turn-arrow');
    }

    showWaitingScreen() {
        this.startScreen.style.display = 'none';
        this.waitingScreen.style.display = 'block';
        this.gameScreen.style.display = 'none';
        this.endScreen.style.display = 'none';
    }

    hideWaitingScreen() {
        this.waitingScreen.style.display = 'none';
    }

    updateGameScreen() {
        this.startScreen.style.display = 'none';
        this.waitingScreen.style.display = 'none';
        this.gameScreen.style.display = 'block';
        this.endScreen.style.display = 'none';
    }

    showGameCode(code) {
        alert(`Ваш код игры: ${code}`);
    }

    showError(message) {
        alert(message);
    }

    renderBoards() {
        this.renderBoard(this.playerBoard, this.game.playerBoard, true);
        this.renderBoard(this.opponentBoard, this.game.opponentBoard, false);
    }

    renderBoard(element, board, isPlayer) {
        element.innerHTML = '';
        for (let y = 0; y < board.size; y++) {
            for (let x = 0; x < board.size; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                const cellState = board.grid[y][x];
                if (isPlayer && cellState === 'ship') {
                    cell.classList.add('ship');
                }
                cell.textContent = this.getCellEmoji(cellState);
                if (!isPlayer) {
                    cell.addEventListener('click', () => this.game.makeMove(x, y));
                }
                element.appendChild(cell);
            }
        }
    }

    updateCell(board, x, y, result) {
        console.log('UI updating cell:', board, x, y, result);
        const isPlayer = board === this.game.playerBoard;
        const boardElement = isPlayer ? this.playerBoard : this.opponentBoard;
        const index = y * board.size + x;
        if (index >= 0 && index < boardElement.children.length) {
            const cell = boardElement.children[index];
            cell.textContent = this.getCellEmoji(result);
            cell.className = 'cell';
            cell.classList.add(result);
        } else {
            console.error('Invalid cell index:', index);
        }
    }

    markSunkShipArea(board, x, y) {
        const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        const shipCells = this.findShipCells(board, x, y);
        
        shipCells.forEach(([shipX, shipY]) => {
            directions.forEach(([dx, dy]) => {
                const newX = shipX + dx;
                const newY = shipY + dy;
                if (newX >= 0 && newX < board.size && newY >= 0 && newY < board.size) {
                    if (board.grid[newY][newX] === null || board.grid[newY][newX] === 'ship') {
                        board.grid[newY][newX] = 'miss';
                        this.updateCell(board, newX, newY, 'miss');
                    }
                }
            });
            board.grid[shipY][shipX] = 'sunk';
            this.updateCell(board, shipX, shipY, 'sunk');
        });
    }

    findShipCells(board, x, y) {
        const shipCells = [[x, y]];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        directions.forEach(([dx, dy]) => {
            let newX = x + dx;
            let newY = y + dy;
            while (newX >= 0 && newX < board.size && newY >= 0 && newY < board.size) {
                if (board.grid[newY][newX] === 'hit' || board.grid[newY][newX] === 'ship') {
                    shipCells.push([newX, newY]);
                    newX += dx;
                    newY += dy;
                } else {
                    break;
                }
            }
        });
        
        return shipCells;
    }

    getCellEmoji(result) {
        switch (result) {
            case 'miss': return '🌊';
            case 'hit': return '💥';
            case 'sunk': return '❌';
            case 'ship': return '🚢';
            default: return '';
        }
    }

    updateTurnInfo(isPlayerTurn) {
        console.log('UI updating turn info:', isPlayerTurn);
        this.turnInfo.textContent = isPlayerTurn ? 'Ваш ход' : 'Ход противника';
        this.turnArrow.textContent = isPlayerTurn ? '🟢' : '🔴';
    }

    showEndScreen(isWinner) {
        this.gameScreen.style.display = 'none';
        this.endScreen.style.display = 'block';
        document.getElementById('result').textContent = isWinner ? 'Вы победили!' : 'Вы проиграли!';
    }
}