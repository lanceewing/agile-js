class GameState {

    /**
     * Constructor for GameState.
     * 
     * @param game The Game from which we'll get all of the game data.
     */
    constructor(game) {

        this.game = game;
        this.vars = [];
        this.flags = [];
        this.strings = [];
        this.controllers = [];

        /**
         * Scan start values for each Logic. Index is the Logic number. We normally start 
         * scanning the Logic at position 0, but this can be set to another  value via the
         * set.scan.start AGI command. Note that only loaded logics can have their scan 
         * offset set. When they are unloaded, their scan offset is forgotten. Logic 0 is
         * always loaded, so its scan start is never forgotten.
         */
        this.scanStart = [];

        this.logics = [];
        this.pictures = [];
        this.views = [];
        this.sounds = [];
        this.objects = new Objects();
        this.objects.copy(game.objects);
        this.words = game.words;
        this.maxDrawn = 15;
        this.priorityBase = 48;
        this.currentInput = "";
        this.lastInput = "";
        this.simpleName = "";
        this.gameId = (game.v3GameSig != null? game.v3GameSig : "UNKNOWN");
        this.version = (game.version === "Unknown"? "2.917" : game.version);
        this.menuEnabled = true;
        this.holdKey = false;
        this.acceptInput = false;
        this.userControl = false;
        this.graphicsMode = false;
        this.showStatusLine = false;
        this.statusLineRow = 0;
        this.pictureRow = 0;
        this.inputLineRow = 0;
        this.horizon = 0;
        this.textAttribute = 0;
        this.foregroundColour = 0;
        this.backgroundColour = 0;
        this.cursorCharacter = "";
        this.totalTicks = 0;
        this.animationTicks = 0;
        this.gamePaused = false;
        this.currentLogNum = 0;
        this.currentRoom = 0;
        this.menuOpen = false;

        /**
         * Indicates that a block has been set.
         */        
        this.blocking = false;

        this.blockUpperLeftX = 0;
        this.blockUpperLeftY = 0;
        this.blockLowerRightX = 0;
        this.blockLowerRightY = 0;

        /**
         * A Map between a key event code and the matching controller number.
         */
        this.keyToControllerMap = new Map();

        /**
         * The List of recognised words from the current user input line.
         */        
        this.recognisedWords = [];

        /**
         * Contains a transcript of events leading to the current state in the current room.
         */
        this.scriptBuffer = new ScriptBuffer(this);

        /**
         * The pixel array for the visual data for the current Picture, where the values
         * are the ARGB values. The dimensions of this are 320x168, i.e. two pixels per 
         * AGI pixel. Makes it easier to copy to the main pixels array when required.
         */
        this.visualPixels = [];

        /**
         * The pixel array for the priority data for the current Picture, where the values
         * are from 4 to 15 (i.e. they are not ARGB values). The dimensions of this one
         * are 160x168 as its usage is non-visual.
         */
        this.priorityPixels = [];

        /**
         * The pixel array for the control line data for the current Picture, where the
         * values are from 0 to 4 (i.e. not ARGB values). The dimensions of this one
         * are 160x168 as its usage is non-visual.
         */        
        this.controlPixels = [];

        /**
         * The Picture that is currently drawn, i.e. the last one for which a draw.pic()
         * command was executed. This will be a clone of an instance in the Pictures array,
         * which may have subsequently had an overlay drawn on top of it.
         */
        this.currentPicture = null;

        /**
         * Whether or not the picture is currently visible. This is set to true after a
         * show.pic call. The draw.pic and overlay.pic commands both set it to false. It's
         * value is used to determine whether to render the AnimatedObjects.
         */        
        this.pictureVisible = false;

        // Create and initialise all of the AnimatedObject entries.
        this.animatedObjects = [];
        for (let i=0; i < Defines.NUMANIMATED; i++)
        {
            this.animatedObjects[i] = new AnimatedObject(this, i);
        }

        /**
         * The List of animated objects that currently have the DRAWN and UPDATE flags set.
         */
        this.updateObjectList = [];

        /**
         * The List of animated objects that have the DRAWN flag set but not the UPDATE flag.
         */
        this.stoppedObjectList = [];

        // Store resources in arrays indexed by number for easy lookup.
        for (let volume of game.volumes) {
            for (let [index, logic] of volume.logics.entries()) { this.logics[index] = logic; }
            for (let [index, picture] of volume.pictures.entries()) { this.pictures[index] = picture; }
            for (let [index, view] of volume.views.entries()) { this.views[index] = view; }
            for (let [index, sound] of volume.sounds.entries()) { this.sounds[index] = sound; }
        }

        // Logic 0 is always marked as loaded. It never gets unloaded.
        if (this.logics[0]) this.logics[0].isLoaded = true;
    }

    get ego() {
        return this.animatedObjects[0];
    }

    /**
     * For making random decisions.
     */    
    get random() {
        return Math.random;
    }

    /**
     * Performs the initialisation of the state of the game being interpreted. Usually called whenever
     * the game starts or restarts.
     */
    init() {
        this.clearVars();
        this.vars[Defines.MACHINE_TYPE] = 0;  // IBM PC
        this.vars[Defines.MONITOR_TYPE] = 3;  // EGA
        this.vars[Defines.INPUTLEN] = Defines.MAXINPUT + 1;
        this.vars[Defines.NUM_VOICES] = 3;

        // The game would usually set this, but no harm doing it here (2 = NORMAL).
        this.vars[Defines.ANIMATION_INT] = 2;

        // Set to the maximum memory amount as recognised by AGI.
        this.vars[Defines.MEMLEFT] = 255;

        this.clearFlags();
        this.flags[Defines.HAS_NOISE] = true;
        this.flags[Defines.INITLOGS] = true;
        this.flags[Defines.SOUNDON] = true;

        // Set the text attribute to default (black on white), and display the input line.
        this.foregroundColour = 15;
        this.backgroundColour = 0;

        this.horizon = Defines.HORIZON;
        this.userControl = true;
        this.blocking = false;

        this.clearVisualPixels();
        this.graphicsMode = true;
        this.acceptInput = false;
        this.showStatusLine = false;
        this.currentLogNum = 0;
        this.currentInput = "";
        this.lastInput = "";
        this.simpleName = "";
        this.keyToControllerMap.clear();
        this.menuEnabled = true;
        this.holdKey = false;

        for (let aniObj of this.animatedObjects) {
            aniObj.reset(true);
        }

        this.stoppedObjectList = [];
        this.updateObjectList = [];

        this.objects = new Objects();
        this.objects.copy(this.game.objects);
    }

    /**
     * Clears all of the AGI flags to be false.
     */
    clearFlags() {
        for (let i = 0; i < Defines.NUMFLAGS; i++) {
            this.flags[i] = false;
        }
    }

    /**
     * Clears all of the AGI variables to be zero.
     */
    clearVars() {
        for (let i = 0; i < Defines.NUMVARS; i++) {
            this.vars[i] = 0;
        }
    }

    /**
     * Clears the VisualPixels screen to it's initial black state.
     */
    clearVisualPixels() {
        for (let i=0; i < this.visualPixels.length; i++) {
            this.visualPixels[i] = AGI_PALETTE[0];
        }
    }
}