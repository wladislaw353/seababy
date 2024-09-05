class Board {
    constructor() {
        this.size = 10;
        this.ships = [];
        this.grid = this.createEmptyGrid();
    }

    createEmptyGrid() {
        return Array(this.size).fill().map(() => Array(this.size).fill(null));
    }

    updateCell(x, y, state) {
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
            if (state === 'hit' && (this.grid[y][x] === 'ship' || this.grid[y][x] === null)) {
                this.grid[y][x] = 'hit';
            } else if (state === 'miss' && (this.grid[y][x] === null || this.grid[y][x] === 'ship')) {
                this.grid[y][x] = 'miss';
            } else if (state === 'sunk') {
                this.grid[y][x] = 'sunk';
            }
        }
    }

    markSunkShipArea(x, y) {
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const shipCells = [];
        const visited = new Set();
        
        const checkCell = (cx, cy) => {
            const key = `${cx},${cy}`;
            if (visited.has(key)) return;
            visited.add(key);
            
            if (cx >= 0 && cx < this.size && cy >= 0 && cy < this.size) {
                if (this.grid[cy][cx] === 'hit' || this.grid[cy][cx] === 'ship' || this.grid[cy][cx] === 'sunk') {
                    shipCells.push([cx, cy]);
                    directions.forEach(([dx, dy]) => checkCell(cx + dx, cy + dy));
                }
            }
        };
    
        checkCell(x, y);
    
        // Отмечаем все клетки вокруг корабля как 'miss'
        shipCells.forEach(([sx, sy]) => {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = sx + dx;
                    const ny = sy + dy;
                    if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                        if (this.grid[ny][nx] === null) {
                            this.grid[ny][nx] = 'miss';
                        }
                    }
                }
            }
        });
    
        return shipCells;
    }

    clear() {
        this.grid = this.createEmptyGrid();
        this.ships = [];
    }
}