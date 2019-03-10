class UserInput {

    /**
     * Constructor for UserInput.
     */
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
        window.addEventListener('keypress', (...args) => this.keyPressed(...args));
    }

    /**
     * Handles the key up event.
     * 
     * @param {*} e The event object for the key up event.
     */
    keyUp(e) {
        this.keys[e.keyCode & 0xFF] = false;
    }

    /**
     * Handles the key down event.
     * 
     * @param {*} e The event object for the key down event.
     */
    keyDown(e) {
        this.keys[e.keyCode & 0xFF] = true;

        // Combine key code with modifiers.
        let keyData = (e.keyCode & 0xFF);
        if (e.shiftKey) keyData |= 0x10000;
        if (e.ctrlKey) keyData |= 0x20000;
        if (e.altKey) keyData |= 0x40000;

        this.keyPressQueue.push(keyData);
    }

    /**
     * Handles the key press event.
     * 
     * @param {*} e The event object for the key press event.
     */
    keyPressed(e) {
        if ((e.charCode >= ' '.charCodeAt(0)) && (e.charCode <= '~'.charCodeAt(0))) {
            this.keyPressQueue.push(0x80000 | e.charCode);
        }
    }

    static get ACCEPT () { return 0; }

    static get ABORT () { return 1; }

    /**
     * Simulates a Thread sleep for the given number of milliseconds.
     * 
     * @param {*} milliseconds The number of milliseconds to wait for.
     */
    async sleep(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    /**
     * Wait for and return either ACCEPT or ABORT.
     */
    async waitAcceptAbort() {
        let action;
        let ignore;

        // Ignore anything currently on the key press queue.
        this.keyPressQueue = [];

        // Now wait for the the next key.
        while ((action = this.checkAcceptAbort()) == -1) {
            await this.sleep(1);
        }

        return action;
    }

    /**
     * Waits for the next key to be pressed then returns the value.
     * 
     * @param {*} clearQueue Whether to clear what is on the queue before waiting.
     * 
     * @returns The key that was pressed.
     */
    async waitForKey(clearQueue = true) {
        let key;

        if (clearQueue) {
            // Ignore anything currently on the key press queue.
            this.keyPressQueue = [];
        }

        // Now wait for the the next key.
        while ((key = this.getKey()) == 0)  {
            await this.sleep(1);
        }

        return key;
    }

    /**
     * Check if either ACCEPT or ABORT has been selected. Return the value if so, -1 otherwise.
     */
    checkAcceptAbort() {
        let c = this.getKey();

        if (c == 13) {       // ENTER
            return UserInput.ACCEPT;
        }
        else if (c == 27) {  // ESC
            return UserInput.ABORT;
        }
        else {
            return -1;
        }
    }

    /**
     * Gets a key from the key queue. Return 0 if none available.
     */
    getKey() {
        if (this.keyPressQueue.length > 0) {
            return this.keyPressQueue.pop();
        }
        else {
            return 0;
        }
    }

    createKeyConversionMap() {
        let controllerMap = new Map();

        controllerMap.set(9, 9);     // Tab
        controllerMap.set(27, 27);   // Esc
        controllerMap.set(13, 13);   // Enter

        // Function keys.
        controllerMap.set((59 << 8) + 0, 112);   // F1
        controllerMap.set((60 << 8) + 0, 113);   // F2
        controllerMap.set((61 << 8) + 0, 114);   // F3
        controllerMap.set((62 << 8) + 0, 115);   // F4
        controllerMap.set((63 << 8) + 0, 116);   // F5
        controllerMap.set((64 << 8) + 0, 117);   // F6
        controllerMap.set((65 << 8) + 0, 118);   // F7
        controllerMap.set((66 << 8) + 0, 119);   // F8
        controllerMap.set((67 << 8) + 0, 120);   // F9
        controllerMap.set((68 << 8) + 0, 121);   // F10

        // Control and another key. Ctrl-I and Ctrl-M not included, due to Tab and Enter.
        controllerMap.set(1, 0x20000 | 65);   // A
        controllerMap.set(2, 0x20000 | 66);   // B
        controllerMap.set(3, 0x20000 | 67);   // C
        controllerMap.set(4, 0x20000 | 68);   // D
        controllerMap.set(5, 0x20000 | 69);   // E
        controllerMap.set(6, 0x20000 | 70);   // F
        controllerMap.set(7, 0x20000 | 71);   // G
        controllerMap.set(8, 0x20000 | 72);   // H

        controllerMap.set(10, 0x20000 | 74);  // J
        controllerMap.set(11, 0x20000 | 75);  // K
        controllerMap.set(12, 0x20000 | 76);  // L

        controllerMap.set(14, 0x20000 | 78);  // N
        controllerMap.set(15, 0x20000 | 79);  // O
        controllerMap.set(16, 0x20000 | 80);  // P
        controllerMap.set(17, 0x20000 | 81);  // Q
        controllerMap.set(18, 0x20000 | 82);  // R
        controllerMap.set(19, 0x20000 | 83);  // S
        controllerMap.set(20, 0x20000 | 84);  // T
        controllerMap.set(21, 0x20000 | 85);  // U
        controllerMap.set(22, 0x20000 | 86);  // V
        controllerMap.set(23, 0x20000 | 87);  // W
        controllerMap.set(24, 0x20000 | 88);  // X
        controllerMap.set(25, 0x20000 | 89);  // Y
        controllerMap.set(26, 0x20000 | 90);  // Z

        // Alt and another key.
        controllerMap.set((16 << 8) + 0, 0x40000 | 81);  // Q
        controllerMap.set((17 << 8) + 0, 0x40000 | 87);  // W
        controllerMap.set((18 << 8) + 0, 0x40000 | 69);  // E
        controllerMap.set((19 << 8) + 0, 0x40000 | 82);  // R
        controllerMap.set((20 << 8) + 0, 0x40000 | 84);  // T
        controllerMap.set((21 << 8) + 0, 0x40000 | 89);  // Y
        controllerMap.set((22 << 8) + 0, 0x40000 | 85);  // U
        controllerMap.set((23 << 8) + 0, 0x40000 | 73);  // I
        controllerMap.set((24 << 8) + 0, 0x40000 | 79);  // O
        controllerMap.set((25 << 8) + 0, 0x40000 | 80);  // P
        controllerMap.set((30 << 8) + 0, 0x40000 | 65);  // A
        controllerMap.set((31 << 8) + 0, 0x40000 | 83);  // S
        controllerMap.set((32 << 8) + 0, 0x40000 | 68);  // D
        controllerMap.set((33 << 8) + 0, 0x40000 | 70);  // F
        controllerMap.set((34 << 8) + 0, 0x40000 | 71);  // G
        controllerMap.set((35 << 8) + 0, 0x40000 | 72);  // H
        controllerMap.set((36 << 8) + 0, 0x40000 | 74);  // J
        controllerMap.set((37 << 8) + 0, 0x40000 | 75);  // K
        controllerMap.set((38 << 8) + 0, 0x40000 | 76);  // L
        controllerMap.set((44 << 8) + 0, 0x40000 | 90);  // Z
        controllerMap.set((45 << 8) + 0, 0x40000 | 88);  // X
        controllerMap.set((46 << 8) + 0, 0x40000 | 67);  // C
        controllerMap.set((47 << 8) + 0, 0x40000 | 86);  // V
        controllerMap.set((48 << 8) + 0, 0x40000 | 66);  // B
        controllerMap.set((49 << 8) + 0, 0x40000 | 78);  // N
        controllerMap.set((50 << 8) + 0, 0x40000 | 77);  // M

        // Normal printable chars.
        controllerMap.set(61, (0x80000 | '='.charCodeAt(0)));
        controllerMap.set(45, (0x80000 | '-'.charCodeAt(0)));
        controllerMap.set(48, (0x80000 | '0'.charCodeAt(0)));
        
        // Manhunter games use unmodified alpha chars as controllers, e.g. C and S.
        controllerMap.set(65, (0x80000 | 'a'.charCodeAt(0)));
        controllerMap.set(66, (0x80000 | 'b'.charCodeAt(0)));
        controllerMap.set(67, (0x80000 | 'c'.charCodeAt(0)));
        controllerMap.set(68, (0x80000 | 'd'.charCodeAt(0)));
        controllerMap.set(69, (0x80000 | 'e'.charCodeAt(0)));
        controllerMap.set(70, (0x80000 | 'f'.charCodeAt(0)));
        controllerMap.set(71, (0x80000 | 'g'.charCodeAt(0)));
        controllerMap.set(72, (0x80000 | 'h'.charCodeAt(0)));
        controllerMap.set(73, (0x80000 | 'i'.charCodeAt(0)));
        controllerMap.set(74, (0x80000 | 'j'.charCodeAt(0)));
        controllerMap.set(75, (0x80000 | 'k'.charCodeAt(0)));
        controllerMap.set(76, (0x80000 | 'l'.charCodeAt(0)));
        controllerMap.set(77, (0x80000 | 'm'.charCodeAt(0)));
        controllerMap.set(78, (0x80000 | 'n'.charCodeAt(0)));
        controllerMap.set(79, (0x80000 | 'o'.charCodeAt(0)));
        controllerMap.set(80, (0x80000 | 'p'.charCodeAt(0)));
        controllerMap.set(81, (0x80000 | 'q'.charCodeAt(0)));
        controllerMap.set(82, (0x80000 | 'r'.charCodeAt(0)));
        controllerMap.set(83, (0x80000 | 's'.charCodeAt(0)));
        controllerMap.set(84, (0x80000 | 't'.charCodeAt(0)));
        controllerMap.set(85, (0x80000 | 'u'.charCodeAt(0)));
        controllerMap.set(86, (0x80000 | 'v'.charCodeAt(0)));
        controllerMap.set(87, (0x80000 | 'w'.charCodeAt(0)));
        controllerMap.set(88, (0x80000 | 'x'.charCodeAt(0)));
        controllerMap.set(89, (0x80000 | 'y'.charCodeAt(0)));
        controllerMap.set(90, (0x80000 | 'z'.charCodeAt(0)));

        // Joysick codes. We're going to ignore these for now. Who uses a Joystick for AGI games anyway?
        controllerMap.set((1 << 8) + 1, 0);
        controllerMap.set((1 << 8) + 2, 0);
        controllerMap.set((1 << 8) + 3, 0);
        controllerMap.set((1 << 8) + 4, 0);

        return controllerMap;
    }
}