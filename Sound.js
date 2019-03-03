class Sound extends Resource {

    constructor(rawData) {
        super();
        this.notes = [];
        decode(rawData);
    }

    decode(rawData) {
        for (let n = 0; n < 4; n++)
        {
            let start = rawData[n * 2 + 0] | (rawData[n * 2 + 1] << 8);
            let end = ((rawData[n * 2 + 2] | (rawData[n * 2 + 3] << 8))) - 5;

            for (let pos = start; pos < end; pos += 5)
            {
                let duration = (rawData[pos + 0] | (rawData[pos + 1] << 8));
                if (duration == 0xFFFF)
                {
                    // Two 0xFF bytes in a row at this point ends the current voice.
                    break;
                }
                let freqdiv = ((rawData[pos + 2] & 0x3F) << 4) + (rawData[pos + 3] & 0x0F);
                //let volume = rawData[pos + 4] & 0x0F;
                let volume = 0x8;  // Volume is set to 0 for PC version, so let's go with 8.
                let frequency = (freqdiv > 0? 111860.0 / freqdiv : 0);
                this.notes[n].push(new Note(n, duration, frequency, volume));
            }
        }
    }
}

class Note {

    constructor(voiceNum, duration, frequency, volume) {
        this.voiceNum = voiceNum;
        this.duration = duration;
        this.frequency = frequency;
        this.volume = volume;
    }

    encode() {
        let rawData = [];
        let freqdiv = (frequency == 0 ? 0 : Math.floor(111860 / frequency));
        // Note that the order of the first two bytes is switched around from how it is stored in an AGI SOUND.
        rawData[0] = (duration & 0xFF);
        rawData[1] = ((duration >> 8) & 0xFF);
        rawData[2] = ((freqdiv >> 4) & 0x3F);
        rawData[3] = 0x80 | ((voiceNum << 5) & 0x60) | (freqdiv & 0x0F);
        rawData[4] = 0x90 | ((voiceNum << 5) & 0x60) | (volume & 0x0F);
        return rawData;
    }
}