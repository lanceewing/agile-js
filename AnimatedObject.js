/**
 * The AnimatedObject class is one of the core classes in the AGI interpreter. An instance of
 * this class holds the state of an animated object on the screen. Many of the action commands
 * change the state within an instance of AnimatedObject, and the interpreter makes use of 
 * the instances of this class stored within the animated object table to perform an animation
 * cycle.
 */
class AnimatedObject {

    /**
     * Constructor for AnimatedObject.
     * 
     * @param {*} state 
     * @param {*} objectNum 
     */
    constructor(state, objectNum) {
        this.state = state;
        this.objectNumber = objectNum;
        this.saveArea = new SaveArea();
        this.reset(true);
    }

    /**
     * The View currently being used by this AnimatedObject.
     */
    get view() {
        return this.state.views[this.currentView];
    }

    /**
     * The number of loops in the View.
     */
    get numberOfLoops() {
        return this.view.loops.length;
    }

    /**
     * The Loop that is currently cycling for this AnimatedObject.
     */
    get loop() {
        return this.view.loops[this.currentLoop];
    }

    /**
     * The number of cels in the current loop.
     */
    get numberOfCels() {
        return this.loop.cels.length;
    }

    /**
     * The Cel currently being displayed.
     */
    get cel() {
        return this.loops.cels[this.currentCel];
    }

    /**
     * Resets the AnimatedObject back to its initial state.
     * 
     * @param {*} fullReset 
     */
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

    /**
     * Updates the AnimatedObject's Direction based on its current MotionType.
     */
    updateDirection() {
        if (this.animated && this.update && this.drawn && (this.stepTimeCount == 1)) {
            switch (this.motionType) {
                case 1: // WANDER
                    this.wander();
                    break;

                case 2: // FOLLOW
                    this.follow();
                    break;

                case 3: // MOVE TO
                    this.moveTo();
                    break;
            }

            // If no blocks are in effect, clear the 'blocked' flag.  Otherwise,
            // if object must observe blocks, check for blocking.
            if (!this.state.blocking) {
                this.blocked = false;
            }
            else if (!this.ignoreBlocks && (this.direction != 0)) {
                this.checkBlock();
            }
        }
    }

    /**
     * Starts the Wander motion for this AnimatedObject.
     */
    startWander() {
        if (this == this.state.ego) {
            this.state.userControl = false;
        }
        this.motionType = MotionType.Wander;
        this.update = true;
    }

    /**
     * If the AnimatedObject has stopped, but the motion type is Wander, then this
     * method picks a random direction and distance.
     * 
     * Note: MotionParam1 is used to track the distance.
     */
    wander() {
        // Wander uses general purpose motion parameter 1 for the distance.
        if ((this.motionParam1-- == 0) || this.stopped) {
            this.direction = this.state.getRandomInt(9);

            // If the AnimatedObject is ego, then set the EGODIR var.
            if (this.objectNumber == 0) {
                this.state.vars[Defines.EGODIR] = this.direction;
            }

            this.motionParam1 = this.state.getRandomInt(Defines.MINDIST, Defines.MAXDIST + 1);
        }
    }

    /**
     * Return the direction from (oldx, oldy) to (newx, newy).  If the object is within
     * 'delta' of the position in both directions, return 0
     * 
     * @param {*} oldx 
     * @param {*} oldy 
     * @param {*} newx 
     * @param {*} newy 
     * @param {*} delta 
     */
    moveDirection(oldx, oldy, newx, newy, delta) {
        return (AnimatedObject.newdir[this.directionIndex(newy - oldy, delta), this.directionIndex(newx - oldx, delta)]);
    }

    /**
     * Return 0, 1, or 2 depending on whether the difference between coords, d, 
     * indicates that the coordinate should decrease, stay the same, or increase. 
     * The return value is used as one of the indeces into 'newdir' above.
     * 
     * @param {*} d 
     * @param {*} delta 
     * 
     * @returns 0, 1, or 2, as described in the summary above.
     */
    directionIndex(d, delta) {
        let index = 0;

        if (d <= -delta) {
            index = 0;
        }
        else if (d >= delta) {
            index = 2;
        }
        else {
            index = 1;
        }

        return index;
    }

    /**
     * Move this AnimatedObject towards ego.
     * 
     * MotionParam1 (endDist): Distance from ego which is considered to be completion of the motion.
     * MotionParam2 (endFlag): Flag to set on completion of the motion
     * MotionParam3 (randDist): Distance to move in current direction (for random search)
     */
    follow() {
        let maxDist = 0;

        // Get coordinates of center of object's & ego's bases.
        let ecx = ((this.state.ego.x + (this.state.ego.xSize / 2)) & 0xFFFF);
        let ocx = ((this.x + (this.xSize / 2)) & 0xFFFF);

        // Get direction from object's center to ego's center.
        let dir = this.moveDirection(ocx, this.y, ecx, this.state.ego.y, this.motionParam1);

        // If the direction is zero, the object and ego have collided, so signal completion.
        if (dir == 0) {
            this.direction = 0;
            this.motionType = MotionType.Normal;
            this.state.flags[this.motionParam2] = true;
            return;
        }

        // If the object has not moved since last time, assume it is blocked and
        // move in a random direction for a random distance no greater than the
        // distance between the object and ego

        // NOTE: randDist = -1 indicates that this is initialization, and thus
        // we don't care about the previous position
        if (this.motionParam3 == -1) {
            this.motionParam3 = 0;
        }
        else if (this.stopped) {
            // Make sure that the object goes in some direction.
            this.direction = this.state.getRandomInt(1, 9);

            // Average the x and y distances to the object for movement limit.
            maxDist = (Math.abs(ocx - ecx) + Math.abs(this.Y - this.state.ego.y)) / 2 + 1;

            // Make sure that the distance is at least the object stepsize.
            if (maxDist <= this.stepSize) {
                this.motionParam3 = this.stepSize;
            }
            else {
                this.motionParam3 = this.state.getRandomInt(this.stepSize, maxDist);
            }

            return;
        }

        // If 'randDist' is non-zero, keep moving the object in the current direction.
        if (this.motionParam3 != 0) {
            if ((this.motionParam3 -= this.stepSize) < 0) {
                // Down with the random movement.
                this.motionParam3 = 0;
            }
            return;
        }

        // Otherwise, just move the object towards ego.  Whew...
        this.direction = dir;
    }

    /**
     * Starts a Follow ego motion for this AnimatedObject.
     * 
     * @param {*} dist Distance from ego which is considered to be completion of the motion.
     * @param {*} completionFlag The number of the flag to set when the motion is completed.
     */
    startFollowEgo(dist, completionFlag) {
        this.motionType = MotionType.Follow;

        // Distance from ego which is considered to be completion of the motion is the larger of 
        // the object's StepSize and the dist parameter.
        this.motionParam1 = (dist > this.stepSize ? dist : this.stepSize);
        this.motionParam2 = completionFlag;
        this.motionParam3 = -1;                  // 'follow' routine expects this.
        this.state.flags[completionFlag] = false;     // Flag to set at completion.
        this.update = true;
    }
    
    /// <summary>
    /// Move this AnimatedObject toward the target (xt, yt) position, as defined below:
    /// 
    /// MotionParam1 (xt): Target X coordinate.
    /// MotionParam2 (yt): Target Y coordinate.
    /// MotionParam3 (oldStep): Old stepsize for this AnimatedObject.
    /// MotionParam4 (endFlag): Flag to set when this AnimatedObject reaches the target position.
    /// </summary>

    /**
     * Move this AnimatedObject toward the target (xt, yt) position, as defined below:
     * 
     * MotionParam1 (xt): Target X coordinate.
     * MotionParam2 (yt): Target Y coordinate.
     * MotionParam3 (oldStep): Old stepsize for this AnimatedObject.
     * MotionParam4 (endFlag): Flag to set when this AnimatedObject reaches the target position.
     */
    moveTo() {
        // Get the direction to move.
        this.direction = this.moveDirection(this.x, this.y, this.motionParam1, this.motionParam2, this.stepSize);

        // If this AnimatedObject is ego, set var[EGODIR]
        if (this.objectNumber == 0) {
            this.state.vars[Defines.EGODIR] = this.direction;
        }

        // If 0, signal completion.
        if (this.drection == 0) {
            this.endMoveObj();
        }
    }

    /**
     * Starts the MoveTo motion for this AnimatedObject.
     * 
     * @param {*} x The x position to move to.
     * @param {*} y The y position to move to.
     * @param {*} stepSize The step size to use for the motion. If 0, then the current StepSize value for this AnimatedObject is used.
     * @param {*} completionFlag The flag number to set when the motion has completed.
     */
    startMoveObj(x, y, stepSize, completionFlag) {
        this.motionType = MotionType.MoveTo;
        this.motionParam1 = x;
        this.motionParam2 = y;
        this.motionParam3 = this.stepSize;
        if (stepSize != 0) {
            this.stepSize = stepSize;
        }
        this.motionParam4 = completionFlag;
        this.state.flags[completionFlag] = false;
        this.update = true;
        if (this == this.state.ego) {
            this.state.userControl = false;
        }
        this.moveTo();
    }

    /**
     * Ends the MoveTo motion for this AnimatedObject.
     */
    endMoveObj() {
        // Restore old step size.
        this.stepSize = this.motionParam3;

        // Set flag indicating completion.
        this.state.flags[this.motionParam4] = true;

        // Set it back to normal motion.
        this.motionType = MotionType.Normal;

        // If this AnimatedObject is ego, then give back user control.
        if (this.objectNumber == 0) {
            this.state.userControl = true;
            this.state.vars[Defines.EGODIR] = 0;
        }
    }

    /**
     * A block is in effect and the object must observe blocks. Check to see
     * if the object can move in its current direction.
     */
    checkBlock() {
        let objInBlock;
        let ox, oy;

        // Get obj coord into temp vars and determine if the object is
        // currently within the block.
        ox = this.x;
        oy = this.y;

        objInBlock = this.inBlock(ox, oy);

        // Get object coordinate after moving.
        switch (this.direction) {
            case 1:
                oy -= this.stepSize;
                break;

            case 2:
                ox += this.stepSize;
                oy -= this.stepSize;
                break;

            case 3:
                ox += this.stepSize;
                break;

            case 4:
                ox += this.stepSize;
                oy += this.stepSize;
                break;

            case 5:
                oy += this.stepSize;
                break;

            case 6:
                ox -= this.stepSize;
                oy += this.stepSize;
                break;

            case 7:
                ox -= this.stepSize;
                break;

            case 8:
                ox -= this.stepSize;
                oy -= this.stepSize;
                break;
        }

        // If moving the object will not change its 'in block' status, let it move.
        if (objInBlock == this.inBlock(ox, oy)) {
            this.blocked = false;
        }
        else {
            this.blocked = true;
            this.direction = 0;

            // When Ego is the blocked object also set ego's direction to zero.
            if (this.objectNumber == 0) {
                this.state.vars[Defines.EGODIR] = 0;
            }
        }
    }

    /**
     * Tests if the currently active block contains the given X/Y position. Ths method should
     * not be called unless a block has been set.
     * 
     * @param {*} x The X position to test.
     * @param {*} y The Y position to test.
     */
    inBlock(x, y) {
        return (x > this.state.blockUpperLeftX && x < this.state.blockLowerRightX && y > this.state.blockUpperLeftY && y < this.state.blockLowerRightY);
    }

    /**
     * Updates this AnimatedObject's position on the screen according to its current state.
     */
    updatePosition() {
        if (this.animated && this.update && this.drawn) {
            // Decrement the move clock for this object.  Don't move the object unless
            // the clock has reached 0.
            if ((this.stepTimeCount != 0) && (--this.stepTimeCount != 0)) return;

            // Reset the move clock.
            this.stepTimeCount = this.stepTime;

            // Clear border collision flag.
            let border = 0;

            let ox = this.x;
            let px = this.x;
            let oy = this.y;
            let py = this.y;
            let od = 0;
            let os = 0;

            // If object has not been repositioned, move it.
            if (!this.repositioned) {
                od = this.direction;
                os = this.stepSize;
                ox += ((AnimatedObject.xs[od] * os) & 0xFFFF);
                oy += ((AnimatedObject.ys[od] * os) & 0xFFFF);
            }

            // Check for object border collision.
            if (ox < Defines.MINX) {
                ox = Defines.MINX;
                border = Defines.LEFT;
            }
            else if (ox + this.xSize > Defines.MAXX + 1) {
                ox = ((Defines.MAXX + 1 - this.xSize) & 0xFFFF);
                border = Defines.RIGHT;
            }
            if (oy - this.ySize < Defines.MINY - 1) {
                oy = ((Defines.MINY - 1 + this.ySize) & 0xFFFF);
                border = Defines.TOP;
            }
            else if (oy > Defines.MAXY) {
                oy = Defines.MAXY;
                border = Defines.BOTTOM;
            }
            else if (!this.ignoreHorizon && (oy <= this.state.horizon)) {
                oy = ((this.state.horizon + 1) & 0xFFFF);
                border = Defines.TOP;
            }

            // Update X and Y to the new position.
            this.x = ox;
            this.y = oy;

            // If object can't be in this position, then move back to previous
            // position and clear the border collision flag
            if (this.collide() || !this.canBeHere()) {
                this.x = px;
                this.y = py;
                border = 0;

                // Make sure that this position is OK
                this.findPosition();
            }

            // If the object hit the border, set the appropriate flags.
            if (border > 0) {
                if (this.objectNumber == 0) {
                    this.state.vars[Defines.EGOEDGE] = border;
                }
                else {
                    this.state.vars[Defines.OBJHIT] = this.objectNumber;
                    this.state.vars[Defines.OBJEDGE] = border;
                }

                // If the object was on a 'moveobj', set the move as finished.
                if (this.motionType == MotionType.MoveTo) {
                    this.endMoveObj();
                }
            }

            // If object was not to be repositioned, it can be repositioned from now on.
            this.repositioned = false;
        }
    }

    /**
     * Return true if the object's position puts it on the screen; false otherwise.
     */
    goodPosition() {
        return ((this.x >= Defines.MINX) && ((this.x + this.xSize) <= Defines.MAXX + 1) && 
            ((this.y - this.ySize) >= Defines.MINY - 1) && (this.y <= Defines.MAXY) &&
            (this.ignoreHorizon || this.y > this.state.horizon));
    }

    /**
     * Find a position for this AnimatedObject where it does not collide with any
     * unappropriate objects or priority regions.  If the object can't be in
     * its current position, then start scanning in a spiral pattern for a position
     * at which it can be placed.
     */
    findPosition() {
        // Place Y below horizon if it is above it and is not ignoring the horizon.
        if ((this.y <= this.state.horizon) && !this.ignoreHorizon) {
            this.y = this.state.horizon + 1;
        }

        // If current position is OK, return.
        if (this.goodPosition() && !this.collide() && this.canBeHere()) {
            return;
        }

        // Start scan.
        let legLen = 1, legDir = 0, legCnt = 1;

        while (!this.goodPosition() || this.collide() || !this.canBeHere()) {
            switch (legDir) {
                case 0:         // Move left.
                    --this.x;

                    if (--legCnt == 0) {
                        legDir = 1;
                        legCnt = legLen;
                    }
                    break;

                case 1:         // Move down.
                    ++this.y;

                    if (--legCnt == 0) {
                        legDir = 2;
                        legCnt = ++legLen;
                    }
                    break;

                case 2:         // Move right.
                    ++this.x;

                    if (--legCnt == 0) {
                        legDir = 3;
                        legCnt = legLen;
                    }
                    break;

                case 3:         // Move up.
                    --this.y;

                    if (--legCnt == 0) {
                        legDir = 0;
                        legCnt = ++legLen;
                    }
                    break;
            }
        }
    }

    /**
     * Checks if this AnimatedObject has collided with another AnimatedObject.
     * 
     * @returns true if collided with another AnimatedObject; otherwise false.
     */
    collide() {
        // If AnimatedObject is ignoring objects then return false.
        if (this.ignoreObjects) {
            return false;
        }

        for (let otherObj of this.state.animatedObjects) {
            // Collision with another object if:
            //	- other object is animated and drawn
            //	- other object is not ignoring objects
            //	- other object is not this object
            //	- the two objects have overlapping baselines
            if (otherObj.animated && otherObj.drawn && 
                !otherObj.ignoreObjects && 
                (this.objectNumber != otherObj.objectNumber) && 
                (this.x + this.xSize >= otherObj.x) && 
                (this.x <= otherObj.x + otherObj.xSize))

                // At this point, the two objects have overlapping
                // x coordinates. A collision has occurred if they have
                // the same y coordinate or if the object in question has
                // moved across the other object in the last animation cycle
                if ((this.y == otherObj.y) || 
                    (this.y > otherObj.y && this.prevY < otherObj.prevY) || 
                    (this.y < otherObj.y && this.prevY > otherObj.prevY))
                {
                    return true;
                }
        }

        return false;
    }

    /**
     * For the given y value, calculates what the priority value should be.
     * 
     * @param {*} y 
     */
    calculatePriority(y) {
        return Math.floor(y < this.state.priorityBase ? 4 : (((y - this.state.priorityBase) / ((168.0 - this.state.priorityBase) / 10.0)) + 5));
    }

    /**
     * Return the effective Y for this Animated Object, which is Y if the priority is not fixed, or if it
     * is fixed then is the value corresponding to the start of the fixed priority band.
     */
    effectiveY() {
        return (this.fixedPriority ? Math.floor(this.state.priorityBase + Math.ceil(((168.0 - this.state.priorityBase) / 10.0) * (this.priority - 4)) - 1) : this.y);
    }

    /**
     * Checks if this AnimatedObject can be in its current position according to
     * the control lines. Normally this method would be invoked immediately after
     * setting its position to a newly calculated position.
     *  
     * There are a number of side effects to calling this method, and in fact 
     * it is responsible for performing these updates:
     *  
     * - It sets the priority value for the current Y position.
     * - It sets the on.water flag, if applicable.
     * - It sets the hit.special flag, if applicable.
     */
    canBeHere() {
        let canBeHere = true;
        let entirelyOnWater = false;
        let hitSpecial = false;

        // If the priority is not fixed, calculate the priority based on current Y position.
        if (!this.fixedPriority) {
            // NOTE: The following table only applies to games that don't support the ability to change the PriorityBase.
            // Priority Band   Y range
            // ------------------------
            //       4 -
            //       5          48 - 59
            //       6          60 - 71
            //       7          72 - 83
            //       8          84 - 95
            //       9          96 - 107
            //      10         108 - 119
            //      11         120 - 131
            //      12         132 - 143
            //      13         144 - 155
            //      14         156 - 167
            //      15            168
            // ------------------------
            this.priority = this.calculatePriority(this.y);
        }

        // Priority 15 skips the whole base line testing. None of the control lines
        // have any affect.
        if (this.priority != 15) {
            // Start by assuming we're on water. Will be set false if it turns out we're not.
            entirelyOnWater = true;

            // Loop over the priority screen pixels for the area overed by this
            // object's base line.
            let startPixelPos = (Y * 160) + X;
            let endPixelPos = startPixelPos + XSize;

            for (let pixelPos = startPixelPos; pixelPos < endPixelPos; pixelPos++) {
                // Get the priority screen priority value for this pixel of the base line.
                let priority = this.state.controlPixels[pixelPos];

                if (priority != 3) {
                    // This pixel is not water (i.e. not 3), so it can't be entirely on water.
                    entirelyOnWater = false;

                    if (priority == 0) {
                        // Permanent block.
                        canBeHere = false;
                        break;
                    }
                    else if (priority == 1) {
                        // Blocks if the AnimatedObject isn't ignoring blocks.
                        if (!this.ignoreBlocks) {
                            canBeHere = false;
                            break;
                        }
                    }
                    else if (priority == 2) {
                        hitSpecial = true;
                    }
                }
            }

            if (entirelyOnWater) {
                if (this.stayOnLand) {
                    // Must not be entirely on water, so can't be here.
                    canBeHere = false;
                }
            }
            else {
                if (this.stayOnWater) {
                    canBeHere = false;
                }
            }
        }

        // If the object is ego then we need to determine the on.water and hit.special flag values.
        if (this.objectNumber == 0) {
            this.state.flags[Defines.ONWATER] = entirelyOnWater;
            this.state.flags[Defines.HITSPEC] = hitSpecial;
        }

        return canBeHere;
    }

    /**
     * Updates the loop and cel numbers based on the AnimatedObjects current state.
     */
    updateLoopAndCel() {
        let newLoop = 0;

        if (this.animated && this.update && this.drawn) {
            // Get the appropriate loop based on the current direction.
            newLoop = S;

            if (!this.fixedLoop) {
                if (this.numberOfLoops == 2 || this.numberOfLoops == 3) {
                    newLoop = AnimatedObject.twoLoop[this.direction];
                }
                else if (this.numberOfLoops == 4) {
                    newLoop = AnimatedObject.fourLoop[this.direction];
                }
                else if ((this.numberOfLoops > 4) && (this.state.gameId == "KQ4")) {
                    // Main Ego View (0) in KQ4 has 5 loops, but is expected to automatically change
                    // loop in sync with the Direction, in the same way as if it had only 4 loops.
                    newLoop = AnimatedObject.fourLoop[this.direction];
                }
            }

            // If the object is to move in this cycle and the loop has changed, point to the new loop.
            if ((this.stepTimeCount == 1) && (newLoop != S) && (this.currentLoop != newLoop)) {
                this.setLoop(newLoop);
            }

            // If it is time to cycle the object, advance it's cel.
            if (this.cycle && (this.cycleTimeCount > 0) && (--this.cycleTimeCount == 0)) {
                this.advanceCel();

                this.cycleTimeCount = this.cycleTime;
            }
        }
    }

    /**
     * Determine which cel of an object to display next.
     */
    advanceCel() {
        if (this.noAdvance) {
            this.noAdvance = false;
            return;
        }

        // Advance to the next cel in the loop.
        let theCel = this.currentCel;
        let lastCel = (this.numberOfCels - 1);

        switch (this.cycleType) {
            case 0: // NORMAL.
                // Move to the next sequential cel.
                if (++theCel > lastCel) {
                    theCel = 0;
                }
                break;

            case 1: // ENDLOOP
                // Advance to the end of the loop, set flag in parms[0] when done
                if (theCel >= lastCel || ++theCel == lastCel) {
                    this.state.flags[this.motionParam1] = true;
                    this.cycle = false;
                    this.direction = 0;
                    this.cycleType = CycleType.Normal;
                }
                break;

            case 2:  // REVERSELOOP
                // Move backwards, celwise, until beginning of loop, then set flag.
                if (theCel == 0 || --theCel == 0) {
                    this.state.flags[this.motionParam1] = true;
                    this.cycle = false;
                    this.direction = 0;
                    this.cycleType = CycleType.Normal;
                }
                break;

            case 3: // REVERSE
                // Cycle continually, but from end of loop to beginning.
                if (theCel > 0) {
                    --theCel;
                }
                else {
                    theCel = lastCel;
                }
                break;
        }

        // Get pointer to the new cel and set cel dimensions.
        this.setCel(theCel);
    }

    /**
     * Adds this AnimatedObject as a permanent part of the current picture. If the priority parameter
     * is 0, the object's priority is that of the priority band in which it is placed; otherwise it
     * will be set to the specified priority value. If the controlBoxColour parameter is below 4, 
     * then a control line box is added to the control screen of the specified control colour value,
     * which extends from the object's baseline to the bottom of the next lowest priority band. If
     * this control box priority is set to 0, then obviously this would prevent animated objects from
     * walking through it. The other 3 control colours have their normal behaviours as well. The
     * add.to.pic objects ignore all control lines, all base lines of other objects, and the "block"
     * if one is active...   i.e. it can go anywhere in the picture. Once added, it is not animated
     * and cannot be erased ecept by drawing something over it. It effectively becomes part of the 
     * picture.
     * 
     * @param {*} viewNum 
     * @param {*} loopNum 
     * @param {*} celNum 
     * @param {*} x 
     * @param {*} y 
     * @param {*} priority 
     * @param {*} controlBoxColour 
     * @param {*} pixels 
     */
    addToPicture(viewNum, loopNum, celNum, x, y, priority, controlBoxColour, pixels) {
        // Add the add.to.pic details to the script event buffer.
        // TODO:
        //state.ScriptBuffer.AddScript(ScriptBuffer.ScriptBufferEventType.AddToPic, 0, new byte[] {
        //    viewNum, loopNum, celNum, x, y, (byte)(priority | (controlBoxColour << 4))
        //});

        // Set the view, loop, and cel to those specified.
        this.setView(viewNum);
        this.setLoop(loopNum);
        this.setCel(celNum);

        // Set PreviousCel to current Cel for Show call.
        this.previousCel = this.cel;

        // Place the add.to.pic at the specified position. This may not be fully within the
        // screen bounds, so a call below to FindPosition is made to resolve this.
        this.x = this.prevX = x;
        this.y = this.prevY = y;

        // In order to make use of FindPosition, we set these flags to disable certain parts
        // of the FindPosition functionality that don't apply to add.to.pic objects.
        this.ignoreHorizon = true;
        this.fixedPriority = true;
        this.ignoreObjects = true;

        // And we set the priority temporarily to 15 so that when FindPosition is doing its thing,
        // the control lines will be ignored, as they have no effect on add.to.pic objects.
        this.priority = 15;

        // Now we call FindPosition to adjust the object's position if it has been placed either 
        // partially or fully outside of the picture area.
        this.findPosition();

        // Having checked and (if appropriate) adjusted the position, we can now work out what the
        // object priority should be.
        if (priority == 0) {
            // If the specified priority is 0, it means that the priority should be calculated 
            // from the object's Y position as would normally happen if its priority is not fixed.
            this.priority = this.calculatePriority(Y);
        }
        else {
            // Otherwise it will be set to the specified value.
            this.priority = priority;
        }

        this.controlBoxColour = controlBoxColour;

        // Draw permanently to the CurrentPicture, including the control box.
        this.draw(this.state.currentPicture);

        // Restore backgrounds, add add.to.pic to VisualPixels, then redraw AnimatedObjects and show updated area.
        this.state.restoreBackgrounds();
        this.draw();
        this.state.drawObjects();
        this.show(pixels);
    }

    /**
     * Set the Cel of this AnimatedObject to the given cel number.
     * 
     * @param {*} celNum The cel number within the current Loop to set the Cel to.
     */
    setCel(celNum) {
        // Set the cel number. 
        this.currentCel = celNum;

        // The border collision can only be performed if a valid combination of loops and cels has been set.
        if ((this.currentLoop < this.numberOfLoops) && (this.currentCel < this.numberOfCels)) {
            // Make sure that the new cel size doesn't cause a border collision.
            if (this.x + this.xSize > Defines.MAXX + 1) {
                // Don't let the object move.
                this.repositioned = true;
                this.x = (Defines.MAXX - this.xSize);
            }

            if (this.y - this.ySize < Defines.MINY - 1) {
                this.repositioned = true;
                this.y = (Defines.MINY - 1 + this.ySize);

                if (this.y <= this.state.horizon && !this.ignoreHorizon) {
                    this.y = (this.state.horizon + 1);
                }
            }
        }
    }

    /**
     * Set the loop of this AnimatedObject to the given loop number.
     * 
     * @param {*} loopNum The loop number within the current View to set the Loop to.
     */
    setLoop(loopNum) {
        this.currentLoop = loopNum;

        // If the current cel # is greater than the cel count for this loop, set
        // it to 0, otherwise leave it alone. Sometimes the loop number is set before
        // the associated view number is set. We allow for this in the check below.
        if ((this.currentLoop >= this.numberOfLoops) || (this.currentCel >= this.numberOfCels)) {
            this.currentCel = 0;
        }

        this.setCel(this.currentCel);
    }

    /**
     * Set the number of the View for this AnimatedObject to use.
     * 
     * @param {*} viewNum The number of the View for this AnimatedObject to use.
     */
    setView(viewNum) {
        this.currentView = viewNum;

        // If the current loop is greater than the number of loops for the view,
        // set the loop number to 0.  Otherwise, leave it alone.
        this.setLoop(this.currentLoop >= this.numberOfLoops? 0 : this.currentLoop);
    }

    /**
     * Performs an animate.obj on this AnimatedObject.
     */
    animate() {
        if (!this.animated) {
            // Most flags are reset to false.
            this.ignoreBlocks = false;
            this.fixedPriority = false;
            this.ignoreHorizon = false;
            this.cycle = false;
            this.blocked = false;
            this.stayOnLand = false;
            this.stayOnWater = false;
            this.ignoreObjects = false;
            this.repositioned = false;
            this.noAdvance = false;
            this.fixedLoop = false;
            this.stopped = false;

            // But these ones are specifying set to true.
            this.animated = true;
            this.update = true;
            this.cycle = true;

            this.motionType = MotionType.Normal;
            this.cycleType = CycleType.Normal;
            this.direction = 0;
        }
    }

    /**
     * Repositions the object by the deltaX and deltaY values.
     * 
     * @param {*} deltaX Delta for the X position (signed, where negative is to the left)
     * @param {*} deltaY Delta for the Y position (signed, where negative is to the top)
     */
    reposition(deltaX, deltaY) {
        this.repositioned = true;

        if ((deltaX < 0) && (this.x < -deltaX)) {
            this.x = 0;
        }
        else {
            this.x = (this.x + deltaX);
        }

        if ((deltaY < 0) && (this.y < -deltaY)) {
            this.y = 0;
        }
        else {
            this.y = (this.y + deltaY);
        }

        // Make sure that this position is OK
        this.findPosition();
    }

    /**
     * Calculates the distance between this AnimatedObject and the given AnimatedObject.
     * 
     * @param {*} aniObj The AnimatedObject to calculate the distance to.
     */
    distance(aniObj) {
        if (!this.drawn || !aniObj.drawn) {
            return Defines.MAXVAR;
        }
        else {
            let dist = Math.abs((this.x + this.xSize / 2) - (aniObj.x + aniObj.xSize / 2)) + Math.abs(this.y - aniObj.y);
            return ((dist > 254) ? 254 : dist);
        }
    }
    
    /**
     * Draws this AnimatedObject to the pixel arrays of the given Picture. This is intended for use by 
     * add.to.pic objects, which is a specialist static type of AnimatedObject that becomes a permanent
     * part of the Picture.
     * 
     * @param {*} picture 
     */
    drawToPicture(picture) {
        let cellWidth = this.cel.width;
        let cellHeight = this.cel.height;
        let cellPixels = this.cel.pixelData;
        let visualPixels = picture.visual;
        let priorityPixels = picture.priority;

        // Get the transparency colour index. We'll use this to ignore pixels this colour.
        let transIndex = this.cel.transparentColor;

        // Calculate starting position within the pixel arrays.
        let aniObjTop = ((this.y - cellHeight) + 1);
        let screenPos = (aniObjTop * 160) + this.x;
        let screenLineAdd = 160 - cellWidth;

        let cellPos = 0;
        let cellLineAdd = cellWidth;

        // Iterate over each of the pixels and decide if the priority screen allows the pixel
        // to be drawn or not when adding them in to the VisualPixels and PriorityPixels arrays. 
        for (let y = 0; y < cellHeight; y++, screenPos += screenLineAdd, cellPos += cellLineAdd) {
            for (let x = 0; x < cellWidth; x++, screenPos++, cellPos++) {
                // Check that the pixel is within the bounds of the AGI picture area.
                if (((aniObjTop + y) >= 0) && ((aniObjTop + y) < 168) && ((this.x + x) >= 0) && ((this.x + x) < 160)) {
                    // Get the priority colour index for this position from the priority screen.
                    let priorityIndex = priorityPixels[screenPos];

                    // If this AnimatedObject's priority is greater or equal to the priority screen value
                    // for this pixel's position, then we'll draw it.
                    if (this.priority >= priorityIndex) {
                        // Get the colour index from the Cell bitmap pixels.
                        let colourIndex = cellPixels[cellPos];

                        // If the colourIndex is not the transparent index, then we'll draw the pixel.
                        if (colourIndex != transIndex) {
                            visualPixels[screenPos] = colourIndex;
                            priorityPixels[screenPos] = this.priority;
                        }
                    }
                }
            }
        }

        // Draw the control box.
        if (this.controlBoxColour <= 3) {
            // Calculate the height of the box.
            let yy = this.y;
            let priorityHeight = 0;
            let objPriorityForY = this.calculatePriority(this.y);
            do
            {
                priorityHeight++;
                if (yy <= 0) break;
                yy--;
            }
            while (this.calculatePriority(yy) == objPriorityForY);
            let height = (byte)(this.ySize > priorityHeight ? priorityHeight : this.ySize);

            // Draw bottom line.
            for (let i = 0; i < this.xSize; i++) {
                priorityPixels[(this.y * 160) + this.x + i] = this.controlBoxColour;
            }

            if (height > 1) {
                // Draw both sides.
                for (let i = 1; i < height; i++) {
                    priorityPixels[((this.y - i) * 160) + this.x] = this.controlBoxColour;
                    priorityPixels[((this.y - i) * 160) + this.x + this.xSize - 1] = this.controlBoxColour;
                }

                // Draw top line.
                for (let i = 1; i < this.xSize - 1; i++) {
                    priorityPixels[((this.y - (height - 1)) * 160) + this.x + i] = this.controlBoxColour;
                }
            }
        }
    }

    /**
     * Draws this AnimatedObject to the VisualPixels pixels array.
     */
    draw() {
        // Start by copying the cell pixel data in to a byte array that we can directly access in a safe way.
        let cellWidth = this.cel.width;
        let cellHeight = this.cel.height;
        let cellPixels = this.cel.pixelData;

        // Get the transparency colour index. We'll use this to ignore pixels this colour.
        let transIndex = this.cel.transparentColor;

        // Calculate starting screen offset. AGI pixels are 2x1 within the picture area.
        let aniObjTop = ((this.y - cellHeight) + 1);
        let screenPos = (aniObjTop * 320) + (this.x * 2);
        let screenLineAdd = 320 - (cellWidth << 1);

        // Calculate starting position within the priority screen.
        let priorityPos = (aniObjTop * 160) + this.x;
        let priorityLineAdd = 160 - cellWidth;

        // Position within the cell pixels depends on whether it is mirrored or not.
        let mirrored = (this.cel.mirrored && (this.cel.mirroredLoop != this.currentLoop));
        let cellPos = (mirrored ? cellWidth - 1 : 0);
        let cellXAdd = (mirrored ? -1 : 1);
        let cellYAdd = (mirrored ? (cellWidth) : -cellWidth);

        // Allocate new background pixel array for the current cell size.
        this.saveArea.visBackPixels = new Uint8Array(cellWidth * cellHeight);
        this.saveArea.priBackPixels = new Uint8Array(cellWidth * cellHeight);
        this.saveArea.x = this.x;
        this.saveArea.y = this.y;
        this.saveArea.width = cellWidth;
        this.saveArea.height = cellHeight;

        // Iterate over each of the pixels and decide if the priority screen allows the pixel
        // to be drawn or not. Deliberately tried to avoid multiplication within the loops.
        for (let y = 0; y < cellHeight; y++, screenPos += screenLineAdd, priorityPos += priorityLineAdd, cellPos += cellYAdd) {
            for (let x = 0; x < cellWidth; x++, screenPos += 2, priorityPos++, cellPos += cellXAdd) {
                // Check that the pixel is within the bounds of the AGI picture area.
                if (((aniObjTop + y) >= 0) && ((aniObjTop + y) < 168) && ((this.x + x) >= 0) && ((this.x + x) < 160)) {
                    // Store the background pixel. Should be the same colour in both pixels.
                    this.saveArea.visBackPixels[x + (y * 160)] = this.state.visualPixels[screenPos];
                    this.saveArea.priBackPixels[x + (y * 160)] = this.state.priorityPixels[priorityPos];

                    // Get the priority colour index for this position from the priority screen.
                    let priorityIndex = this.state.priorityPixels[priorityPos];

                    // If this AnimatedObject's priority is greater or equal to the priority screen value
                    // for this pixel's position, then we'll draw it.
                    if (this.priority >= priorityIndex) {
                        // Get the colour index from the Cell bitmap pixels.
                        let colourIndex = cellPixels[cellPos];

                        // If the colourIndex is not the transparent index, then we'll draw the pixel.
                        if (colourIndex != transIndex) {
                            // Get the ARGB value from the AGI Color Palette.
                            let colorArgb = AGI_PALETTE[colourIndex];

                            // Draw two pixels (due to AGI picture pixels being 2x1).
                            this.state.visualPixels[screenPos] = colorArgb;
                            this.state.visualPixels[screenPos + 1] = colorArgb;

                            // Priority screen is only stored 160x168 though.
                            this.state.priorityPixels[priorityPos] = this.priority;
                        }
                    }
                }
            }
        }
    }

    /**
     * Restores the current background pixels to the previous position of this AnimatedObject.
     */
    restoreBackPixels() {
        if ((this.saveArea.visBackPixels != null) && (this.saveArea.priBackPixels != null)) {
            let saveWidth = this.saveArea.width;
            let saveHeight = this.saveArea.height;
            let aniObjTop = ((this.saveArea.y - saveHeight) + 1);
            let screenPos = (aniObjTop * 320) + (this.saveArea.X * 2);
            let screenLineAdd = 320 - (saveWidth << 1);
            let priorityPos = (aniObjTop * 160) + this.saveArea.X;
            let priorityLineAdd = 160 - saveWidth;

            for (let y = 0; y < saveHeight; y++, screenPos += screenLineAdd, priorityPos += priorityLineAdd) {
                for (let x = 0; x < saveWidth; x++, screenPos += 2, priorityPos++) {
                    if (((aniObjTop + y) >= 0) && ((aniObjTop + y) < 168) && ((this.saveArea.x + x) >= 0) && ((this.saveArea.x + x) < 160)) {
                        this.state.visualPixels[screenPos] = this.saveArea.visBackPixels[x, y];
                        this.state.visualPixels[screenPos + 1] = this.saveArea.visBackPixels[x, y];
                        this.state.priorityPixels[priorityPos] = this.saveArea.priBackPixels[x, y];
                    }
                }
            }
        }
    }

    /**
     * Used to sort by drawing order when drawing AnimatedObjects to the screen. When 
     * invoked, it compares the other AnimatedObject with this one and says which is in
     * front and which is behind. Since we want to draw those with lowest priority first, 
     * and if their priority is equal then lowest Y, then this is what determines whether
     * we return a negative value, equal, or greater.
     * 
     * @param {*} other The other AnimatedObject to compare this one to.
     */
    compareTo(other) {
        if (this.priority < other.priority) {
            return -1;
        }
        else if (this.priority > other.priority) {
            return 1;
        }
        else {
            if (this.effectiveY() < other.effectiveY()) {
                return -1;
            }
            else if (this.effectiveY() > other.effectiveY()) {
                return 1;
            }
            else {
                return 0;
            }
        }
    }    
}

// Object views -- Same, Right, Left, Front, Back.
//AnimatedObject.S = 4;
//AnimatedObject.R = 0;
//AnimatedObject.L = 1;
//AnimatedObject.F = 2;
//AnimatedObject.B = 3;

AnimatedObject.twoLoop = [ 4, 4, 0, 0, 0, 4, 1, 1, 1 ];
AnimatedObject.fourLoop = [ 4, 3, 0, 0, 0, 2, 1, 1, 1 ];

AnimatedObject.xs = [ 0, 0, 1, 1, 1, 0, -1, -1, -1 ];
AnimatedObject.ys = [ 0, -1, -1, 0, 1, 1, 1, 0, -1 ];

/**
 * New Direction matrix to support the MoveDirection method.
 */
AnimatedObject.newdir = [ [8, 1, 2], [7, 0, 3], [6, 5, 4] ];

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
