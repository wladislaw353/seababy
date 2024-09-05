class API {
    static async createGame() {
        return await this.sendRequest('create');
    }

    static async joinGame(gameCode) {
        return await this.sendRequest('join', { gameCode });
    }

    static async getGameState(gameCode, lastEventId) {
        return await this.sendRequest('getState', { gameCode, lastEventId });
    }

    static async makeMove(gameCode, player, x, y) {
        return await this.sendRequest('makeMove', { gameCode, player, x, y });
    }

    static async endGame(gameCode) {
        return await this.sendRequest('endGame', { gameCode });
    }

    static async sendRequest(action, data = {}) {
        const body = new URLSearchParams({ action, ...data }).toString();
        try {
            const response = await fetch('/backend/index.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}