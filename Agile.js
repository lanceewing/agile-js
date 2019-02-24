class Agile {

    constructor(game, canvas) {
        this.targetElaspedTime = (1000 / 60);
        this.ctx = canvas.getContext('2d');
        this.imgData = this.ctx.createImageData(160, 120);
        this.pixels = [];
        this.game = game;
        this.userInput = new UserInput();
        this.interpreter = new Interpreter(game, this.userInput, this.pixels);
    }

    async start() {
        await this.game.decodeGame();

        // AGI tick happens 60 times a second, and sometimes previous tick takes longer
        // than 16.7 ms, but we need the next one to run, because sometimes the previous
        // one is waiting for something to change that the next tick changes!
        window.setInterval(function() { $.agile.tick(); }, this.targetElaspedTime);

        this.render();
    }

    tick() {
        const now = new Date().getTime();

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
            this.interpreter.tick();
        }
    }

    _render() {
        $.agile.render();
    }

    render() {
        // Immediately request another invocation on the next frame.
        requestAnimationFrame(this._render);

        // Blit the pixel data to the canvas. That's all we do for a frame render.
        let i = 0;
        let j = 0;
        for (; i < 64000; i++) {
            let d = this.pixels[i];
            this.imgData.data[j++] = (d >> 16) & 0xFF;
            this.imgData.data[j++] = (d >> 8) & 0xFF;
            this.imgData.data[j++] = d & 0xFF;
            this.imgData.data[j++] = 0xFF;
        }
        this.ctx.putImageData(this.imgData, 0, 0);
    }
}