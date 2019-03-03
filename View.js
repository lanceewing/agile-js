class View extends Resource {

    constructor(rawData) {
        super();
        this.decode(new ByteStream(rawData));
    }

    decode(data) {
        this.loops = [];
        let unk1 = data.readByte();
        let unk2 = data.readByte();
        let numLoops = data.readByte();
        let descriptionOffset = data.readShort();
        for (let i = 0; i < numLoops; i++) {
            // Loop header
            let loop = new Loop();
            let loopOffset = data.readShort();
            let streamPosLoop = data.position;
            data.position = loopOffset;
            let numCels = data.readByte();
            for (let j = 0; j < numCels; j++) {
                let celOffset = data.readShort();
                let streamPosCel = data.position;
                data.position = loopOffset + celOffset;
                // Cel header
                let celWidth = data.readByte();
                let celHeight = data.readByte();
                let celMirrorTrans = data.readByte();
                let celMirrored = (celMirrorTrans & 0x80) == 0x80;
                let celMirrorLoop = (celMirrorTrans >>> 4) & 7;
                let celTransparentColor = celMirrorTrans & 0x0F;
                if (celMirrorLoop == i)
                    celMirrored = false;
                let cel = new Cel(celWidth, celHeight, celTransparentColor, celMirrored, celMirrorLoop);
                if (!celMirrored) {
                    cel.pixelData = new Uint8Array(cel.width * cel.height);
                    for (let k = 0; k < cel.pixelData.length; k++) {
                        cel.pixelData[k] = celTransparentColor;
                    }
                    let celY = 0;
                    let celX = 0;
                    while (true) {
                        let chunkData = data.readByte();
                        if (chunkData == 0) {
                            celX = 0;
                            celY++;
                            if (celY >= celHeight)
                                break;
                        }
                        let color = chunkData >>> 4;
                        let numPixels = chunkData & 0x0F;
                        for (let x = 0; x < numPixels; x++) {
                            cel.pixelData[celY * celWidth + celX + x] = color;
                        }
                        celX += numPixels;
                    }
                }
                loop.cels[j] = cel;
                data.position = streamPosCel;
            }
            this.loops[i] = loop;
            data.position = streamPosLoop;
        }
        data.position = descriptionOffset;
        while (true) {
            let chr = data.readByte();
            if (chr == 0)
                break;
            this.description += String.fromCharCode(chr);
        }
    }
}

class Cel {
    constructor(width, height, transparentColor, mirrored, mirroredLoop) {
        this.width = width;
        this.height = height;
        this.transparentColor = transparentColor;
        this.mirrored = mirrored;
        this.mirroredLoop = mirroredLoop;
    }
}

class Loop {
    constructor() {
        this.cels = [];
    }
}