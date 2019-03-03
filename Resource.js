class Resource {

    constructor() {
        this.isLoaded = false;
        this.index = 0;
    }

    /**
     * Handles both the encrypt and decrypt operations. They're both the same, as the XOR is reversed
     * if you do it a second time.
     * 
     * @param {*} rawData 
     * @param {*} start 
     * @param {*} end 
     */
    crypt(rawData, start, end) {
        let avisDurganPos = 0;

        for (let i = start; i < end; i++) {
            rawData[i] ^= (("Avis Durgan".charCodeAt(avisDurganPos++ % 11)) & 0xFF);
        }
    }
}