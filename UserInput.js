class UserInput {

    constructor() {
        this.keys = [];
        this.oldKeys = [];
        this.keyPressQueue = [];
        this.keyCodeMap = this.createKeyConversionMap();
        this.reverseKeyCodeMap = new Map();

        for (let [key, value] of this.keyCodeMap) {
            if (!this.reverseKeyCodeMap.has(value) && (value != 0)) {
                this.reverseKeyCodeMap.set(value, key);
            }
        }

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

    createKeyConversionMap() {
        let controllerMap = new Map();

        // TODO: Add mappings.

        return controllerMap;
    }
}