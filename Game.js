class Game {

    constructor(gameFolder) {
        this.gameFolder = gameFolder;
        this.volumes = [];
        this.v2Dirs = ["LOGDIR", "PICDIR", "VIEWDIR", "SNDDIR"];
    }

    decodeGame() {
        return Promise.all([
            this.readObjectFile(),
            this.readWordsFile(),
            this.readV2Resources()
        ]);
    }

    async readObjectFile() {
        let rawObjectData = await this.fetchFile(this.gameFolder + "/OBJECT");
        this.objects = new Objects(new Uint8Array(rawObjectData));
    }

    async readWordsFile() {
        let rawWordsData = await this.fetchFile(this.gameFolder + "/WORDS.TOK");
        this.objects = new Words(new Uint8Array(rawWordsData));
    }

    async readV2Resources() {
        let fsVols = [];
        let readBuffer = [];

        for (let dirNum = 0; dirNum < this.v2Dirs.length; dirNum++) {
            let dir = this.v2Dirs[dirNum];
            let dirFileArrayBuffer = await this.fetchFile(this.gameFolder + "/" + dir);
            let dirFile = new ByteStream(new Uint8Array(dirFileArrayBuffer));
            let resourceCount = 0;

            for (let index = 0; index < dirFile.length / 3; index++) {
                dirFile.read(readBuffer, 0, 3);

                // Check if there is a resource at this position
                if (readBuffer[0] == 0xFF && readBuffer[1] == 0xFF && readBuffer[2] == 0xFF)
                continue;

                // Get volume number that contains the resource
                let volNum = (readBuffer[0] & 0xF0) >> 4;
                let volPosition = ((readBuffer[0] & 0x0F) << 16) + (readBuffer[1] << 8) + readBuffer[2];

                // Open vol file if it's not already opened
                if (!fsVols[volNum]) {
                    let volFileArrayBuffer = await this.fetchFile(this.gameFolder + "/VOL." + volNum);
                    fsVols[volNum] = new ByteStream(new Uint8Array(volFileArrayBuffer));

                    // Create a volume
                    this.volumes[volNum] = new Volume();
                }

                // Check validity of resource position
                if (volPosition > fsVols[volNum].length)
                {
                    // SKIPPING: Resource header position is out of bounds. Skipping resource.
                    continue;
                }

                let headerBuffer = [];

                // Seek to resource position in volfile
                fsVols[volNum].position = volPosition;

                // Read header
                fsVols[volNum].read(headerBuffer, 0, 5);

                // Check header ID
                if (headerBuffer[0] == 0x12 && headerBuffer[1] == 0x34) {

                    // Get resource length
                    let resourceLength = headerBuffer[3] + (headerBuffer[4] << 8);

                    // Check resource length validity
                    if (resourceLength > fsVols[volNum].length)
                    {
                        // SKIPPING: Resource length will cause out of bounds. Skipping resource.
                        continue;
                    }

                    // Read entire resource into memory buffer
                    let resourceBuffer = [];
                    fsVols[volNum].read(resourceBuffer, 0, resourceLength);

                    // Decode the resource.
                    switch (dir) {
                        case "LOGDIR":
                            this.volumes[volNum].logics[index] = new Logic(resourceBuffer);
                            break;

                        case "PICDIR":
                            this.volumes[volNum].pictures[index] = new Picture(resourceBuffer);
                            break;

                        case "VIEWDIR":
                            this.volumes[volNum].views[index] = new View(resourceBuffer);
                            break;

                        case "SNDDIR":
                            this.volumes[volNum].sounds[index] = new Sound(resourceBuffer);
                            break;
                    }
                }
            }
        }
    }

    fetchFile(url) {
        var request = new XMLHttpRequest();

        return new Promise(function (resolve, reject) {
            request.onreadystatechange = function () {
                if (request.readyState !== 4) return;

                if (request.status >= 200 && request.status < 300) {
                    resolve(request.response);
                } else {
                    reject({
                        status: request.status,
                        statusText: request.statusText
                    });
                }
            };
    
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.send();
        });
    }

    /*
    var logdirRecords: IDirectoryEntry[] = [],
        picdirRecords: IDirectoryEntry[] = [],
        viewdirRecords: IDirectoryEntry[] = [],
        snddirRecords: IDirectoryEntry[] = [];
    var volBuffers: Fs.ByteStream[] = [];
    var availableVols: boolean[] = [];
    export var fontStream: Fs.ByteStream;

    function parseDirfile(buffer: Fs.ByteStream, records: IDirectoryEntry[]): void {
        var length: number = buffer.length / 3;
        for (var i: number = 0; i < length; i++) {
            var val: number = (buffer.readUint8() << 16) + (buffer.readUint8() << 8) + buffer.readUint8();
            var volNo: number = val >>> 20;
            var volOffset: number = val & 0xFFFFF;
            if (val >>> 16 == 0xFF)
                continue;
            records[i] = { volNo: volNo, volOffset: volOffset };
            if (availableVols[volNo] === undefined)
                availableVols[volNo] = true;
        }
    }

    export enum AgiResource {
        Logic,
        Pic,
        View,
        Sound
    }

    export function readAgiResource(type: AgiResource, num: number): Fs.ByteStream {
        var record = null;
        switch (type) {
            case AgiResource.Logic:
                record = logdirRecords[num];
                break;
            case AgiResource.Pic:
                record = picdirRecords[num];
                break;
            case AgiResource.View:
                record = viewdirRecords[num];
                break;
            case AgiResource.Sound:
                record = snddirRecords[num];
                break;
            default:
                throw "Undefined resource type: " + type;
        }
        var volstream = new Fs.ByteStream(volBuffers[record.volNo].buffer, record.volOffset);
        var sig: number = volstream.readUint16();
        var volNo: number = volstream.readUint8();
        var resLength = volstream.readUint16();
        var volPart = new Fs.ByteStream(volstream.buffer, record.volOffset + 5, record.volOffset + 5 + resLength);
        return volPart;
    }

    export function load(path: string, done: () => void) {
        Fs.downloadAllFiles(path, ["LOGDIR", "PICDIR", "VIEWDIR", "SNDDIR"], (buffers: Fs.IByteStreamDict) => {
            console.log("Directory files downloaded.");
            parseDirfile(buffers["LOGDIR"], logdirRecords);
            parseDirfile(buffers["PICDIR"], picdirRecords);
            parseDirfile(buffers["VIEWDIR"], viewdirRecords);
            parseDirfile(buffers["SNDDIR"], snddirRecords);
            var volNames: string[] = [];
            for (var i = 0; i < availableVols.length; i++) {
                if (availableVols[i] === true) {
                    volNames.push("VOL." + i);
                }
            }
            Fs.downloadAllFiles(path, volNames, (buffers: Fs.IByteStreamDict) => {
                console.log("Resource volumes downloaded.");
                for (var j: number = 0; j < volNames.length; j++) {
                    volBuffers[j] = buffers[volNames[j]];
                }
                Fs.downloadAllFiles("", ["font.bin"], (buffers: Fs.IByteStreamDict) => {
                    fontStream = buffers["font.bin"];
                    done();
                });
            });
        });
    }
    */

}