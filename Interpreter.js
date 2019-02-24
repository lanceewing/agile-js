class Interpreter {

    constructor(game, userInput, pixels) {
        this.state = new GameState(game);
        this.game = game;
        this.userInput = userInput;
        this.pixels = pixels;
    }

    tick() {

    }
}