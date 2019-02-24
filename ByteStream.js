class ByteStream {

    constructor(buffer) {
        this.buffer = buffer;
        this.position = 0;
    }

    readByte() {
        return this.buffer[this.position++];
    }

    readShort(littleEndian = true) {
        let b1 = this.buffer[this.position++];
        let b2 = this.buffer[this.position++];
        if (littleEndian) {
            return (b2 << 8) + b1;
        }
        return (b1 << 8) + b2;
    }

    read(array, offset, count) {
        for (let i=0; i<count; i++) {
            array[offset + i] = this.readByte();
        }
    }

    get length() {
        return this.buffer.length;
    }
}