/**
 * Interpreter is the core class in the AGI interpreter. It controls the overall interpreter cycle.
 */
class Interpreter {

    /**
     * Constructor for Interpreter.
     * 
     * @param {*} game 
     * @param {*} userInput 
     * @param {*} pixels 
     */
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

        // Indicates that a thread is currently executing the Tick, i.e. a single interpretation 
        // cycle. This flag exists because there are some AGI commands that wait for something to 
        // happen before continuing. For example, a print window will stay up for a defined timeout
        // period or until a key is pressed. In such cases, the thread can be in the Tick method 
        // for the duration of what would normally be many Ticks. 
        this.inTick = false;
    }

    /**
     * Updates the internal AGI game clock. This method is invoked once a second.
     */
    updateGameClock() {
        if (++this.state.vars[Defines.SECONDS] >= 60) {
            // One minute has passed.
            if (++this.state.vars[Defines.MINUTES] >= 60) { 
                // One hour has passed.
                if (++this.state.vars[Defines.HOURS] >= 24) {
                    // One day has passed.
                    this.state.vars[Defines.DAYS]++;
                    this.state.vars[Defines.HOURS] = 0;
                }
                this.state.vars[Defines.MINUTES] = 0;
            }
            this.state.vars[Defines.SECONDS] = 0;
        }
    }

    /**
     * Executes a single AGI interpreter tick, or cycle. This method is invoked 60 times a
     * second, but the rate at which the logics are run and the animation updated is determined
     * by the animation interval variable.
     */
    tick() {
        // Regardless of whether we're already in a Tick, we keep counting the number of Ticks.
        this.state.totalTicks++;

        // Tick is called 60 times a second, so every 60th call, the second clock ticks. We 
        // deliberately do this outside of the main Tick block because some scripts wait for 
        // the clock to reach a certain clock value, which will never happen if the block isn't
        // updated outside of the Tick block.
        if ((this.state.totalTicks % 60) == 0) {
            this.updateGameClock();
        }

        // Only one thread can be running the core interpreter cycle at a time.
        if (!this.inTick) {
            this.inTick = true;

            // Proceed only if the animation tick count has reached the set animation interval x 3.
            if (++this.state.animationTicks < (this.state.vars[Defines.ANIMATION_INT] * 3)) {
                this.inTick = false;
                return;
            }

            // Reset animation tick count.
            this.state.animationTicks = 0;

            // Clear controllers and get user input.
            this.processUserInput();

            // Update input line text on every cycle.
            this.textGraphics.updateInputLine(false);

            // If ego is under program control, override user input as to his direction.
            if (!this.state.userControl) {
                this.state.vars[Defines.EGODIR] = this.ego.direction;
            }
            else {
                this.ego.direction = this.state.vars[Defines.EGODIR];
            }

            // Calculate the direction in which objects will move, based on their MotionType. We do
            // this here, i.e. call UpdateObjectDirections() before starting the logic scan, to
            // allow ego's direction to be known to the logics even when ego is on a move.obj().
            this.updateObjectDirections();

            // Continue scanning LOGIC 0 while the return value is above 0, indicating a room change.
            while (this.newRoom(this.commands.executeLogic(0))) ;

            // Set ego's direction from the variable.
            this.ego.direction = this.state.vars[Defines.EGODIR];

            // Update the status line, in case the score or sound status have changed.
            this.textGraphics.updateStatusLine();

            this.state.vars[Defines.OBJHIT] = 0;
            this.state.vars[Defines.OBJEDGE] = 0;

            // Clear the restart, restore, & init logics flags.
            this.state.flags[Defines.INITLOGS] = false;
            this.state.flags[Defines.RESTART] = false;
            this.state.flags[Defines.RESTORE] = false;

            // If in graphics mode, animate the AnimatedObjects.
            if (this.state.graphicsMode) {
                this.animateObjects();
            }

            // If there is an open text window, we render it now.
            if (this.textGraphics.isWindowOpen()) {
                this.textGraphics.drawWindow();
            }

            // Store what the key states were in this cycle before leaving.
            for (let i = 0; i < 256; i++) this.userInput.oldKeys[i] = this.userInput.keys[i];

            this.inTick = false;
        }
    }

    /**
     * If the room has changed, then performs all the necessary updates to vars, flags, 
     * animated objects, controllers, and other state to prepare for entry in to the 
     * next room. If the room hasn't changed, it returns false up front and does nothing
     * else.
     * 
     * @param {*} roomNum true if the room has changed; otherwise false.
     */
    newRoom(roomNum) {
        // TODO: Implement.
        return false;
    }

    /**
     * Asks every AnimatedObject to calculate their direction based on their current state.
     */
    updateObjectDirections() {
        for (let aniObj of this.state.animatedObjects) {
            aniObj.updateDirection();
        }
    }

    /**
     * Animates each of the AnimatedObjects that are currently on the screen. This 
     * involves the cell cycling, the movement, and the drawing to the screen.
     */
    animateObjects() {
        // Ask each AnimatedObject to update its loop and cell number if required.
        for (let aniObj of this.state.animatedObjects) {
            aniObj.updateLoopAndCel();
        }

        this.state.Vars[Defines.EGOEDGE] = 0;
        this.state.Vars[Defines.OBJHIT] = 0;
        this.state.Vars[Defines.OBJEDGE] = 0;

        // Restore the backgrounds of the previous drawn cels for each AnimatedObject.
        this.state.restoreBackgrounds(this.state.updateObjectList);

        // Ask each AnimatedObject to move if it needs to.
        for (let aniObj of this.state.animatedObjects) {
            aniObj.updatePosition();
        }

        // Draw the AnimatedObjects to screen in priority order.
        this.state.drawObjects(this.state.makeUpdateObjectList());
        this.state.showObjects(this.pixels, this.state.updateObjectList);

        // Clear the 'must be on water or land' bits for ego.
        this.state.ego.stayOnLand = false;
        this.state.ego.stayOnWater = false;
    }

    /**
     * Processes the user's input.
     */
    processUserInput() {
        this.state.clearControllers();
        this.state.flags[Defines.INPUT] = false;
        this.state.flags[Defines.HADMATCH] = false;
        this.state.vars[Defines.UNKNOWN_WORD] = 0;
        this.state.vars[Defines.LAST_CHAR] = 0;

        // If opening of the menu was "triggered" in the last cycle, we open it now before processing the rest of the input.
        if (this.state.menuOpen) {
            this.menu.menuInput();
        }

        // F12 shows the priority and control screens.
        if (this.userInput.keys[123] && !userInput.oldKeys[123]) {
            while (this.userInput.keys[123]);
            this.commands.showPriorityScreen();
        }

        // Handle arrow keys.
        if (this.state.userControl) {
            if (this.state.holdKey) {
                // In "hold key" mode, the ego direction directly reflects the direction key currently being held down.
                let direction = 0;
                if (this.userInput.Keys[38]) direction = 1;        // UP
                if (this.userInput.Keys[33]) direction = 2;        // PAGEUP
                if (this.userInput.Keys[39]) direction = 3;        // RIGHT
                if (this.userInput.Keys[34]) direction = 4;        // PAGEDOWN
                if (this.userInput.Keys[40]) direction = 5;        // DOWN
                if (this.userInput.Keys[35]) direction = 6;        // END
                if (this.userInput.Keys[37]) direction = 7;        // LEFT
                if (this.userInput.Keys[36]) direction = 8;        // HOME
                this.state.vars[Defines.EGODIR] = direction;
            }
            else {
                // Whereas in "release key" mode, the direction key press will toggle movement in that direction.
                let direction = 0;
                if (this.userInput.keys[38] && !this.userInput.oldKeys[38]) direction = 1;    // UP
                if (this.userInput.keys[33] && !this.userInput.oldKeys[33]) direction = 2;    // PAGEUP
                if (this.userInput.keys[39] && !this.userInput.oldKeys[39]) direction = 3;    // RIGHT
                if (this.userInput.keys[34] && !this.userInput.oldKeys[34]) direction = 4;    // PAGEDOWN
                if (this.userInput.keys[40] && !this.userInput.oldKeys[40]) direction = 5;    // DOWN
                if (this.userInput.keys[35] && !this.userInput.oldKeys[35]) direction = 6;    // END
                if (this.userInput.keys[37] && !this.userInput.oldKeys[37]) direction = 7;    // LEFT
                if (this.userInput.keys[36] && !this.userInput.oldKeys[36]) direction = 8;    // HOME
                if (direction > 0) {
                    this.state.vars[Defines.EGODIR] = (this.state.vars[Defines.EGODIR] == direction ? 0 : direction);
                }
            }
        }

        // Check all waiting characters.
        let ch;
        while ((ch = this.userInput.getKey()) > 0) {
            // Check controller matches. They take precedence.
            if (this.state.keyToControllerMap.has(ch)) {
                this.state.controllers[this.state.keyToControllerMap[ch]] = true;
            }
            else if ((ch >= (0x80000 + 'A'.charCodeAt(0))) && (ch <= (0x80000 + 'Z'.charCodeAt(0))) && 
                     (this.state.keyToControllerMap.has(0x80000 + String.fromCharCode(ch - 0x80000).toLowerCase().charCodeAt(0)))) {
                // We map the lower case alpha chars in the key map, so check for upper case and convert to
                // lower when setting controller state. This allows for if the user has CAPS LOCK on.
                this.state.controllers[this.state.keyToControllerMap[0x80000 + String.fromCharCode(ch - 0x80000).toLowerCase().charCodeAt(0)]] = true;
            }
            else if ((ch & 0xF0000) == 0x80000)  // Standard char from a keypress event.  
            {
                this.state.vars[Defines.LAST_CHAR] = (ch & 0xff);

                if (this.state.acceptInput)  {
                    // Handle normal characters for user input line.
                    if ((this.state.strings[0].length + (this.state.cursorCharacter != '' ? 1 : 0) + this.state.currentInput.length) < Defines.MAXINPUT)
                    {
                        this.state.currentInput += String.fromCharCode(ch & 0xff);
                    }
                }
            }
            else if ((ch & 0xFF) == ch)   // Unmodified Keys value, i.e. there is no modifier. 
            {
                this.state.vars[Defines.LAST_CHAR] = (ch & 0xff);

                if (this.state.acceptInput) {
                    // Handle enter and backspace for user input line.
                    switch (ch) {
                        case 13:  // ENTER
                            if (this.state.currentInput.length > 0)
                            {
                                this.parser.parse(this.state.currentInput);
                                this.state.lastInput = this.state.currentInput;
                                this.state.currentInput = '';
                            }
                            while (this.userInput.keys[13]) { /* Wait until ENTER released */ }
                            break;

                        case 8:  // BACK
                            if (this.state.currentInput.length > 0) {
                                this.state.currentInput = this.state.currentInput.slice(0, -1);
                            }
                            break;
                    }
                }
            }
        }
    }
}