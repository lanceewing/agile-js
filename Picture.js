class Picture extends Resource {

    constructor(rawData) {
        super();
        this.stream = new ByteStream(rawData);
        this.picEnabled = false;
        this.priEnabled = false;
        this.picColor = 0;
        this.priColor = 0;
        this.penSize = 0;
        this.penSplatter = false;
        this.penRectangle = true;
        this.circles = [
            ["p"],
            ["xp"],
            [" x ", "xxx", "xpx", "xxx", " x "],
            [" xx ", " xx ", "xxxx", "xxpx", "xxxx", " xx ", " xx "],
            ["  x  ", " xxx ", "xxxxx", "xxxxx", "xxpxx", "xxxxx", "xxxxx", " xxx ", "  x  "],
            ["  xx  ", " xxxx ", " xxxx ", " xxxx ", "xxxxxx", "xxxpxx", "xxxxxx", " xxxx ", " xxxx ", " xxxx ", "  xx  "],
            ["  xxx  ", " xxxxx ", " xxxxx ", " xxxxx ", "xxxxxxx", "xxxxxxx", "xxxpxxx", "xxxxxxx", "xxxxxxx", " xxxxx ", " xxxxx ", " xxxxx ", "  xxx  "],
            ["   xx   ", "  xxxx  ", " xxxxxx ", " xxxxxx ", " xxxxxx ", "xxxxxxxx", "xxxxxxxx", "xxxxpxxx", "xxxxxxxx", "xxxxxxxx", " xxxxxx ", " xxxxxx ", " xxxxxx ", "  xxxx  ", "   xx   "]
        ];
        this.visible = new Uint8Array(160 * 168);
        this.priority = new Uint8Array(160 * 168);
        this.draw();
    }
    
    setPixel(x, y, drawVis = true, drawPri = true) {
        if (this.picEnabled && drawVis)
            this.visible[y * 160 + x] = this.picColor;
        if (this.priEnabled && drawPri)
            this.priority[y * 168 + x] = this.priColor;
    }

    round(aNumber, dirn) {
        if (dirn < 0)
            return ((aNumber - Math.floor(aNumber) <= 0.501) ?
                Math.floor(aNumber) : Math.ceil(aNumber));
        return ((aNumber - Math.floor(aNumber) < 0.499) ?
            Math.floor(aNumber) : Math.ceil(aNumber));
    }

    drawLine(x1, y1, x2, y2) {
        let x, y;
        let height = y2 - y1;
        let width = x2 - x1;
        let addX = (height == 0 ? height : width / Math.abs(height));
        let addY = (width == 0 ? width : height / Math.abs(width));
        if (Math.abs(width) > Math.abs(height)) {
            y = y1;
            addX = (width == 0 ? 0 : width / Math.abs(width));
            for (x = x1; x != x2; x += addX) {
                this.setPixel(this.round(x, addX), this.round(y, addY));
                y += addY;
            }
            this.setPixel(x2, y2);
        }
        else {
            x = x1;
            addY = (height == 0 ? 0 : height / Math.abs(height));
            for (y = y1; y != y2; y += addY) {
                this.setPixel(this.round(x, addX), this.round(y, addY));
                x += addX;
            }
            this.setPixel(x2, y2);
        }
    }

    opDrawXCorner() {
        let startX = this.stream.readByte();
        let startY = this.stream.readByte();
        this.setPixel(startX, startY);
        while (true) {
            let x2 = this.stream.readByte();
            if (x2 >= 0xF0)
                break;
            this.drawLine(startX, startY, x2, startY);
            startX = x2;
            let y2 = this.stream.readByte();
            if (y2 >= 0xF0)
                break;
            this.drawLine(startX, startY, startX, y2);
            startY = y2;
        }
        this.stream.position--;
    }

    opDrawYCorner() {
        let startX = this.stream.readByte();
        let startY = this.stream.readByte();
        this.setPixel(startX, startY);
        while (true) {
            let y2 = this.stream.readByte();
            if (y2 >= 0xF0)
                break;
            this.drawLine(startX, startY, startX, y2);
            startY = y2;
            let x2 = this.stream.readByte();
            if (x2 >= 0xF0)
                break;
            this.drawLine(startX, startY, x2, startY);
            startX = x2;
        }
        this.stream.position--;
    }

    opDrawAbs() {
        let startX = this.stream.readByte();
        let startY = this.stream.readByte();
        while (true) {
            let nextX = this.stream.readByte();
            if (nextX >= 0xF0)
                break;
            let nextY = this.stream.readByte();
            this.drawLine(startX, startY, nextX, nextY);
            startX = nextX;
            startY = nextY;
        }
        this.stream.position--;
    }

    opDrawRel() {
        let startX = this.stream.readByte();
        let startY = this.stream.readByte();
        while (true) {
            let val = this.stream.readByte();
            if (val >= 0xF0)
                break;
            let xDisp = (val >>> 4) & 0x07;
            if ((val & 0x80) === 0x80)
                xDisp = -xDisp;
            let yDisp = val & 0x07;
            if ((val & 8) == 8)
                yDisp = -yDisp;
            let nextX = startX + xDisp;
            let nextY = startY + yDisp;
            this.drawLine(startX, startY, nextX, nextY);
            startX = nextX;
            startY = nextY;
        }
        this.stream.position--;
    }

    opFillFastQueue() {
        while (true) {
            let queue = new FastQueue();
            let startX = this.stream.readByte();
            if (startX >= 0xF0)
                break;
            let startY = this.stream.readByte();
            queue.enqueue(startX);
            queue.enqueue(startY);
            // Visible
            let pos;
            let x;
            let y;
            while (!queue.isEmpty()) {
                x = queue.dequeue();
                y = queue.dequeue();
                if (this.picEnabled) {
                    if (this.visible[y * 160 + x] != 0x0F)
                        continue;
                    this.setPixel(x, y, true, false);
                }
                if (this.priEnabled) {
                    if (this.priority[y * 160 + x] != 0x04)
                        continue;
                    this.setPixel(x, y, false, true);
                }
                if (x > 0) {
                    queue.enqueue(x - 1);
                    queue.enqueue(y);
                }
                if (x < 160 - 1) {
                    queue.enqueue(x + 1);
                    queue.enqueue(y);
                }
                if (y > 0) {
                    queue.enqueue(x);
                    queue.enqueue(y - 1);
                }
                if (y < 168 - 1) {
                    queue.enqueue(x);
                    queue.enqueue(y + 1);
                }
            }
        }
        this.stream.position--;
    }

    opSetPen() {
        let value = this.stream.readByte();
        this.penSplatter = ((value & 0x20) == 0x20);
        this.penRectangle = ((value & 0x10) == 0x10);
        this.penSize = value & 0x07;
    }

    drawPenRect(penX, penY) {
        let w = this.penSize + 1;
        let left = penX - Math.ceil(w / 2);
        let right = penX + Math.floor(w / 2);
        let top = penY - w;
        let bottom = penY + w;
        for (let x = left; x <= right; x++) {
            for (let y = top; y <= bottom; y++) {
                this.setPixel(x, y);
            }
        }
    }

    drawPenCircle(x, y) {
    }

    drawPenSplat(x, y, texture) {
    }

    opDrawPen() {
        while (true) {
            let firstArg = this.stream.readByte();
            if (firstArg >= 0xF0)
                break;
            if (this.penSplatter) {
                let texNumber = firstArg;
                let x = this.stream.readByte();
                let y = this.stream.readByte();
                this.drawPenSplat(x, y, texNumber);
            }
            else {
                let x = firstArg;
                let y = this.stream.readByte();
                if (this.penSize == 0) {
                    this.setPixel(x, y);
                }
                else if (this.penRectangle) {
                    this.drawPenRect(x, y);
                }
                else {
                    this.drawPenCircle(x, y);
                }
            }
        }
        this.stream.position--;
    }

    draw() {
        this.stream.position = 0;
        let processing = true;
        while (processing) {
            let opCode = this.stream.readByte();
            if (opCode >= 0xF0) {
                // opcode
                switch (opCode) {
                    case 0xF0:
                        this.picEnabled = true;
                        this.picColor = this.stream.readByte();
                        break;
                    case 0xF1:
                        this.picEnabled = false;
                        break;
                    case 0xF2:
                        this.priEnabled = true;
                        this.priColor = this.stream.readByte();
                        break;
                    case 0xF3:
                        this.priEnabled = false;
                        break;
                    case 0xF4:
                        this.opDrawYCorner();
                        break;
                    case 0xF5:
                        this.opDrawXCorner();
                        break;
                    case 0xF6:
                        this.opDrawAbs();
                        break;
                    case 0xF7:
                        this.opDrawRel();
                        break;
                    case 0xF8:
                        this.opFillFastQueue();
                        break;
                    case 0xF9:
                        this.opSetPen();
                        break;
                    case 0xFA:
                        this.opDrawPen();
                        break;
                    case 0xFF:
                        processing = false;
                        break;
                }
            }
        }
    }
}

class FastQueue {
    constructor() {
        this.maxSize = 8000;
        this.container = new Uint8Array(this.maxSize);
        this.eIndex = 0;
        this.dIndex = 0;
    }
    isEmpty() {
        return this.eIndex == this.dIndex;
    }
    enqueue(val) {
        if (this.eIndex + 1 == this.dIndex || (this.eIndex + 1 == this.maxSize && this.dIndex == 0))
            throw "Queue overflow";
        this.container[this.eIndex++] = val;
        if (this.eIndex == this.maxSize)
            this.eIndex = 0;
    }
    dequeue() {
        if (this.dIndex == this.maxSize)
            this.dIndex = 0;
        if (this.dIndex == this.eIndex)
            throw "The queue is empty";
        return this.container[this.dIndex++];
    }
}