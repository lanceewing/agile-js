class UserInput {

    constructor() {
        // Register event handlers for window key events.
        window.addEventListener('keydown', (...args) => this.keyDown(...args));
        window.addEventListener('keyup', (...args) => this.keyUp(...args));
        window.addEventListener('keypressed', (...args) => this.keyPressed(...args));
    }

    keyUp(e) {

    }

    keyDown(e) {

    }

    keyPressed(e) {

    }
}