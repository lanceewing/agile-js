class Words {

    constructor(rawData) {
        this.wordToNumber = new Map();
        this.numberToWords = new Map();
        decode(rawData);
    }

    /**
     * Decodes the raw data of the WORDS.TOK file to create two Map instances that
     * store the words in two different usable forms. The first of these is a map between
     * the word text and the word number that it maps to. The second is a map between a 
     * word number and the set of words that belong to that word number (i.e. the synonyms).
     * 
     * @param {[]} rawData The raw data of the WORDS.TOK file.
     */
    decode(rawData) {
        // The first word's text always starts at offset 0x34 (i.e. 52)
        let offset = 0x34;
        let newWord = [];

        while (offset < (rawData.length - 1))
        {
            // The first byte tells us how may letters of the previous word we will reuse.
            let wordPos = rawData[offset++];
            let data;

            // Now continue looping through the remaining letters until we find the end.
            do
            {
                // Each character is XORed with 0x7F as a simply way of hiding the text.
                newWord[wordPos++] = (((data = rawData[offset++]) ^ 0x7F) & 0x7F) & 0xFF;
            }
            while (data < 0x80);   // The word ends when the top bit is set.

            let wordStr = String.fromCharCode(wordStr.slice(0, wordPos));

            let wordNum = (rawData[offset++] << 8) + rawData[offset++];

            this.addWord(wordNum, wordStr);
        }
    }

    /**
     * Adds a new word for the given word text and word number. The word number does not need
     * to be unique. When the word number is already in use, then the new word being added is
     * a synonym for the existing word(s) using that word number.
     * 
     * @param {*} wordNum The word number for the word being added.
     * @param {*} wordText The word text for the word being added.
     */
    addWord(wordNum, wordText) {
        // Add a mapping from the word text to its word number.
        this.wordToNumber.set(wordText, wordNum);

        // Add the word text to the set of words for the given word number.
        let words;
        if (this.numberToWords.has(wordNum))
        {
            words = this.numberToWords.get(wordNum);
        }
        else
        {
            words = new Set();
            this.numberToWords.set(wordNum, words);
        }
        words.add(wordText);

        words = new Set(Array.from(words).sort());
    }
}