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

    }

    /**
     * Processes the user's input.
     */
    processUserInput() {

    }


}