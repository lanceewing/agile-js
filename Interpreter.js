/**
 * Interpreter is the core class in the AGI interpreter. It controls the overall interpreter cycle.
 */
class Interpreter {

    constructor(game, userInput, pixels) {
        this.state = new GameState(game);
        this.game = game;
        this.userInput = userInput;
        this.pixels = pixels;
        this.textGraphics = new TextGraphics(this.pixels, this.state, this.userInput);
        this.parser = new Parser(this.state);
        this.soundPlayer = new SoundPlayer(this.state);
        this.menu = new Menu(this.state, this.textGraphics, this.pixels, this.userInput);
        this.commands = new Commands(this.pixels, this.state, this.userInput, this.textGraphics, this.parser, this.soundPlayer, this.menu);
        this.ego = this.state.ego;
        this.state.init();
        this.textGraphics.updateInputLine();
    }

    tick() {

    }
}