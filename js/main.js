document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    document.getElementById('create-game-btn').addEventListener('click', async () => {
        const gameCode = await game.createGame();
        document.getElementById('game-code').textContent = gameCode;
        document.getElementById('waiting-game-code').textContent = gameCode;
        document.getElementById('game-code-display').style.display = 'block';
        
        // Копируем код в буфер обмена
        navigator.clipboard.writeText(gameCode).then(() => {
        }, (err) => {
            console.error('Could not copy text: ', err);
        });

        // Переходим в режим ожидания после небольшой задержки
        setTimeout(() => {
            game.waitForOpponent();
        }, 2000);
    });

    document.getElementById('join-game-btn').addEventListener('click', () => {
        const gameCode = document.getElementById('game-code-input').value;
        game.joinGame(gameCode);
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
        window.location.reload();
    });
});