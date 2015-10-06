// Copyright 2015 by Paulo Augusto Peccin. See license.txt distributed with this file.

// ROMs with (n >= 4) * 8K banks, mapped in 4 8K banks starting at 0x4000
// Controls an internal SCC soundchip with audio output through PSG
wmsx.CartridgeKonamiSCC = function(rom) {

    function init(self) {
        self.rom = rom;
        var content = self.rom.content;
        bytes = new Array(content.length);
        self.bytes = bytes;
        for(var i = 0, len = content.length; i < len; i++)
            bytes[i] = content[i];
        numBanks = (content.length / 8192) | 0;
    }

    this.connect = function(machine) {
        psgAudioOutput = machine.psg.getAudioOutput();
        scc = new wmsx.SCCMixedAudioChannel();
        psgAudioOutput.setAudioCartridge(scc);
    };

    this.disconnect = function(machine) {
        psgAudioOutput.setAudioCartridge(undefined);
    };

    this.powerOn = function(paused) {
        bank1Offset = bank2Offset = bank3Offset = bank4Offset = -0x4000;
    };

    this.write = function(address, value) {
        if (address >= 0x5000 && address <= 0x57ff)
            bank1Offset = (value % numBanks) * 0x2000 - 0x4000;
        else if (address >= 0x7000 && address <= 0x77ff)
            bank2Offset = (value % numBanks) * 0x2000 - 0x6000;
        else if (address >= 0x9000 && address <= 0x97ff) {
            bank3Offset = (value % numBanks) * 0x2000 - 0x8000;
            sccSelected = (value & 0x3f) === 0x3f;                   // Special value to activate the SCC
        } else if(sccSelected && address >= 0x9800 && address <= 0x9fff)
            scc.write(address, value);
        else if (address >= 0xb000 && address <= 0xb7ff)
            bank4Offset = (value % numBanks) * 0x2000 - 0xa000;
    };

    this.read = function(address) {
        if (address < 0x6000)
            return bytes[bank1Offset + address];                    // May underflow if address < 0x4000
        else if (address < 0x8000)
            return bytes[bank2Offset + address];
        else if (address < 0x9800)
            return bytes[bank3Offset + address];
        else if (address < 0xa000)
            return sccSelected ? scc.read(address) : bytes[bank3Offset + address];
        else
            return bytes[bank4Offset + address];
    };


    var bytes;
    this.bytes = null;

    var bank1Offset;
    var bank2Offset;
    var bank3Offset;
    var bank4Offset;
    var numBanks;

    var scc;
    var sccSelected = false;
    var psgAudioOutput;

    this.rom = null;
    this.format = wmsx.SlotFormats.KonamiSCC;


    // Savestate  -------------------------------------------

    this.saveState = function() {
        return {
            f: this.format.name,
            r: this.rom.saveState(),
            b: wmsx.Util.compressArrayToStringBase64(bytes),
            b1: bank1Offset,
            b2: bank2Offset,
            b3: bank3Offset,
            b4: bank4Offset,
            n: numBanks,
            s: scc.saveState()
        };
    };

    this.loadState = function(s) {
        this.rom = wmsx.ROM.loadState(s.r);
        bytes = wmsx.Util.uncompressStringBase64ToArray(s.b);
        bank1Offset = s.b1;
        bank2Offset = s.b2;
        bank3Offset = s.b3;
        bank4Offset = s.b4;
        numBanks = s.n;
        s.loadState(s.s);
    };


    if (rom) init(this);

};

wmsx.CartridgeKonamiSCC.prototype = wmsx.Slot.base;

wmsx.CartridgeKonamiSCC.createFromSaveState = function(state) {
    var cart = new wmsx.CartridgeKonamiSCC();
    cart.loadState(state);
    return cart;
};