class Board {
    constructor() {
        this.size = 10;
        this.ships = [];
        this.grid = this.createEmptyGrid();
    }

    createEmptyGrid() {
        return Array(this.size).fill().map(() => Array(this.size).fill(null));
    }

    randomizeShips() {
        this.clear();
        const shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
        for (let size of shipSizes) {
            let placed = false;
            while (!placed) {
                const x = Math.floor(Math.random() * this.size);
                const y = Math.floor(Math.random() * this.size);
                const horizontal = Math.random() < 0.5;
                if (this.canPlaceShip(x, y, size, horizontal)) {
                    this.placeShip(x, y, size, horizontal);
                    placed = true;
                }
            }
        }
    }

    canPlaceShip(x, y, size, horizontal) {
        for (let i = 0; i < size; i++) {
            const checkX = horizontal ? x + i : x;
            const checkY = horizontal ? y : y + i;
            if (checkX >= this.size || checkY >= this.size || this.grid[checkY][checkX] !== null) {
                return false;
            }
            if (!this.checkSurroundingCells(checkX, checkY)) {
                return false;
            }
        }
        return true;
    }

    checkSurroundingCells(x, y) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX >= 0 && checkX < this.size && checkY >= 0 && checkY < this.size) {
                    if (this.grid[checkY][checkX] !== null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    placeShip(x, y, size, horizontal) {
        for (let i = 0; i < size; i++) {
            const placeX = horizontal ? x + i : x;
            const placeY = horizontal ? y : y + i;
            this.grid[placeY][placeX] = 'ship';
        }
    }

    updateCell(x, y, state) {
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
            this.grid[y][x] = state;
            console.log(`Updated cell at (${x}, ${y}) to ${state}`);
        } else {
            console.error('Invalid cell coordinates:', x, y);
        }
    }

    clear() {
        this.grid = this.createEmptyGrid();
        this.ships = [];
    }
}