class Objects extends Resource {

    constructor(rawData) {
        super();
        this.objects = [];
        this.numOfAnimatedObjects = 0;
        this.crypted = false;
        if (rawData) {
            this.decode(rawData);
        }
    }

    copy(objects) {
        this.numOfAnimatedObjects = objects.numOfAnimatedObjects;
        this.objects = [];
        this.crypted = false;
        for (let obj of objects.objects) {
            this.objects.push({ name: obj.name, room: obj.room });
        }        
    }

    get(objectNum) {
        return this.objects[objectNum];
    }

    set(objectNum, object) {
        this.objects[objectNum] = object;
    }

    get count() {
        return this.objects.length;
    }

    isCrypt(rawData) {
        return ((rawData[1] & 0xF0) == ('v'.charCodeAt(0) & 0xF0));
    }

    /**
     * Decodes the raw OBJECT file data to build a list of Objects.
     * 
     * @param {*} rawData 
     */
    decode(rawData) {
        // Decrypt the raw data.
        if (this.crypted = this.isCrypt(rawData))
        {
            this.crypt(rawData, 0, rawData.length);
        }

        // The first two bytes point the start of the object names.
        let numOfObjects = (rawData[0] + (rawData[1] << 8)) / 3;

        // Number of animated objects appears next.
        this.numOfAnimatedObjects = rawData[2];

        // Add each Object to the Objects List.
        for (let objectNum = 0, marker = 3; objectNum < numOfObjects; objectNum++, marker += 3) {
            // Calculate the start of this object name.
            let objectNameStart = rawData[marker] + (rawData[marker + 1] << 8) + 3;
            let objectNameEnd = objectNameStart;

            while (rawData[objectNameEnd++] != 0) ;

            // Convert the byte data between the object name start and end in to an ASCII string.
            let objectName = String.fromCharCode.apply(null, (rawData.slice(objectNameStart, objectNameEnd - 1)));

            this.objects.push({ name: objectName, room: rawData[marker + 2] });
        }
    }
}
