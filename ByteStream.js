class ByteStream {

    position = 0;
    length = 0;

    constructor(buffer, startPosition = 0, end = 0) {
        if (end == 0) {
            this.end = this.buffer.length;
        }
        this.length = this.end - this.startPosition;
    }

    readUint8() {
        return this.buffer[this.startPosition + this.position++];
    }

    readUint16(littleEndian = true) {
        let b1 = this.buffer[this.startPosition + this.position++];
        let b2 = this.buffer[this.startPosition + this.position++];
        if (littleEndian) {
            return (b2 << 8) + b1;
        }
        return (b1 << 8) + b2;
    }
}