document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    document.getElementById('create-game-btn').addEventListener('click', () => {
        game.createGame();
    });

    document.getElementById('join-game-btn').addEventListener('click', () => {
        const gameCode = document.getElementById('game-code-input').value;
        game.joinGame(gameCode);
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
        game.restart();
    });
});