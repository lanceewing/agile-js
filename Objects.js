class Objects extends Resource {

    constructor(rawData) {
        super();
        this.objects = [];
        this.numOfAnimatedObjects = 0;
        this.crypted = false;
        this.decode(rawData);
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
        return ((rawData[1] & 0xF0) == ('v' & 0xF0));
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
            this.crypt(rawData, 0, rawData.Length);
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
            let objectName = String.fromCharCode(rawData.slice(objectNameStart, objectNameEnd - objectNameStart - 1));

            this.objects.push(new Object(objectName, rawData[marker + 2]));
        }
    }
}