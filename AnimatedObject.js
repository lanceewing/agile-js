class AnimatedObject {

    constructor(state, objectNum) {
        this.state = state;
        this.objectNumber = objectNum;
        this.saveArea = new SaveArea();
        this.reset(true);
    }

    reset(fullReset = false) {
        this.animated = false;
        this.drawn = false;
        this.update = true;

        this.previousCel = null;
        this.saveArea.visBackPixels = null;
        this.saveArea.priBackPixels = null;

        this.stepSize = 1;
        this.cycleTime = 1;
        this.cycleTimeCount = 1;
        this.stepTime = 1;
        this.stepTimeCount = 1;

        // A full reset is to go back to the initial state, whereas a normal reset is
        // simply for changing rooms.
        if (fullReset) {
            this.blocked = false;
            this.controlBoxColour = 0;
            this.currentCel = 0;
            this.currentLoop = 0;
            this.currentView = 0;
            this.cycle = false;
            this.cycleType = CycleType.Normal;
            this.direction = 0;
            this.fixedLoop = false;
            this.fixedPriority = false;
            this.ignoreBlocks = false;
            this.ignoreHorizon = false;
            this.ignoreObjects = false;
            this.motionParam1 = 0;
            this.motionParam2 = 0;
            this.motionParam3 = 0;
            this.motionParam4 = 0;
            this.motionType = MotionType.Normal;
            this.noAdvance = false;
            this.prevX = this.x = 0;
            this.prevY = this.y = 0;
            this.priority = 0;
            this.repositioned = false;
            this.stayOnLand = false;
            this.stayOnWater = false;
            this.stopped = false;
        }
    }

    updateDirection() {
        
    }
}

class SaveArea {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.visBackPixels = null;
        this.priBackPixels = null;
    }
}

class MotionType {

    /**
     * AnimatedObject is using the normal motion.
     */
    static get Normal() { return 0; }

    /**
     * AnimatedObject randomly moves around the screen.
     */
    static get Wander() { return 1; }

    /**
     * AnimatedObject follows another AnimatedObject.
     */
    static get Follow() { return 2; }

    /**
     * AnimatedObject is moving to a given coordinate.
     */
    static get MoveTo() { return 3; }
}

/**
 * Defines the type of cel cycling that an AnimatedObject can have.
 */
class CycleType {

    /**
     * Normal repetitive cycling of the AnimatedObject.
     */
    static get Normal() { return 0; }

    /**
     * Cycle to the end of the loop and then stop.
     */
    static get EndLoop() { return 1; }

    /**
     * Cycle in reverse order to the start of the loop and then stop.
     */
    static get ReverseLoop() { return 2; }

    /**
     * Cycle continually in reverse.
     */
    static get Reverse() { return 3; }
}
