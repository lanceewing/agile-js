class Agile {

    constructor() {
        this.targetElaspedTime = (1000 / 60);
    }

    start() {

        
        // AGI tick happens 60 times a second, and sometimes previous tick takes longer
        // than 16.7 ms, but we need the next one to run, because sometimes the previous
        // one is waiting for something to change that the next tick changes!
        window.setTimeout(function() { _tick(); }, this.targetElaspedTime);

        render();
    }

    _tick() {
        $.agile.tick(new Date().getTime());
    }

    tick(now) {
        // Calculates the time since the last invocation of the game loop.
        this.deltaTime = now - (this.lastTime? this.lastTime : (now - 16));
        this.lastTime = now;

        // We can't be certain that this method is being invoked at exactly 60 times a
        // second, or that a call hasn't been skipped, so we adjust as appropriate based
        // on the delta time and play catch up if needed. This should avoid drift in the
        // AGI clock and keep the animation smooth.
        while (this.deltaTime > this.targetElaspedTime)
        {
            this.deltaTime -= this.targetElaspedTime;
            //interpreter.Tick();
        }
    }

    _render() {
        $.agile.render();
    }

    render() {
        // Immediately request another invocation on the next frame.
        requestAnimationFrame(this._render);

        // TODO: Simply render the screen. Maybe a blit? Not sure if we need a separate render call, or if the tick will work by itself.
    }
}