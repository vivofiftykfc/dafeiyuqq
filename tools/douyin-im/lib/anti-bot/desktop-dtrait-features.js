export function createDesktopDTraitHash(context) {
    const cache = {};
    return (value, seed = 0) => {
        if (typeof value !== 'string') {
            void 'length_error, raw:'
                .concat(value, ', type:')
                .concat(typeof value);
            context.onDiagnostic('murmur3_len');
        }
        const text = typeof value === 'string' ? value : String(value);
        let bytes;
        if (!cache[text]) {
            try {
                cache[text] = context.encoder.encode(text);
                bytes = cache[text];
            }
            catch (error) {
                void ''.concat(error);
                context.onDiagnostic('murmur3_encode');
                bytes = new Uint8Array(0);
            }
        }
        else
            bytes = cache[text];
        const length = bytes.length, blocks = Math.floor(length / 4);
        let hash = seed;
        for (let i = 0; i < blocks; i++) {
            const at = i * 4;
            let k = bytes[at] |
                (bytes[at + 1] << 8) |
                (bytes[at + 2] << 16) |
                (bytes[at + 3] << 24);
            k = Math.imul(k, 0xcc9e2d51);
            k = (k << 15) | (k >>> 17);
            hash ^= Math.imul(k, 0x1b873593);
            hash = (hash << 13) | (hash >>> 19);
            hash = Math.imul(hash, 5) + 0xe6546b64;
        }
        let tail = 0;
        const at = 4 * blocks, remainder = length & 3;
        if (remainder === 3)
            tail ^= bytes[at + 2] << 16;
        if (remainder >= 2)
            tail ^= bytes[at + 1] << 8;
        if (remainder >= 1) {
            tail ^= bytes[at];
            tail = Math.imul(tail, 0xcc9e2d51);
            tail = (tail << 15) | (tail >>> 17);
            hash ^= Math.imul(tail, 0x1b873593);
        }
        hash ^= length;
        hash ^= hash >>> 16;
        hash = Math.imul(hash, 0x85ebca6b);
        hash ^= hash >>> 13;
        hash = Math.imul(hash, 0xc2b2ae35);
        return (hash ^ (hash >>> 16)) >>> 0;
    };
}
const versionZero = {};
for (let i = 1; i <= 10; i++)
    versionZero[`bool_${i}`] = i;
for (let i = 1; i <= 33; i++)
    versionZero[`str_${i}`] = i + 31;
const mappings = { 0: versionZero };
function encodeIndexed(getFeatures) {
    const bytes = new Uint8Array(Object.keys(getFeatures()).length * 5);
    const keys = Object.keys(getFeatures());
    let at = 0;
    for (const key of keys) {
        bytes[at] = parseInt(key, 10);
        const value = getFeatures()[key];
        bytes[at + 1] = (value >>> 24) & 255;
        bytes[at + 2] = (value >>> 16) & 255;
        bytes[at + 3] = (value >>> 8) & 255;
        bytes[at + 4] = value & 255;
        at += 5;
    }
    return bytes;
}
export class DesktopDTraitFeatures {
    context;
    reserved = 0;
    dTraitType = 1;
    centralAccessType = 0;
    edgeAccessType = 1;
    version = 0;
    boolFeatures = {};
    numberFeatures = {};
    centralStringFeatures = {};
    edgeStringFeatures = {};
    constructor(context, options) {
        this.context = context;
        this.reserved = options.reserved || 0;
        this.dTraitType = options.dTraitType || 1;
        this.version = options.version || 0;
    }
    addBoolFeature(name, value) {
        const index = mappings?.[this.version]?.[name];
        if (index && index >= 0 && index <= 480)
            this.boolFeatures[index] = Boolean(value);
    }
    addNumFeature(name, value) {
        const index = mappings?.[this.version]?.[name];
        if (index && index >= 16 && index <= 31)
            this.numberFeatures[index] = value;
    }
    addStringFeature(name, value) {
        const index = mappings?.[this.version]?.[name];
        if (index && index >= 32 && index <= 255) {
            this.centralStringFeatures[index] = value;
            this.edgeStringFeatures[index] = this.context.hash(value.toString());
        }
    }
    getCentralStringBuffer() {
        return encodeIndexed(() => this.centralStringFeatures);
    }
    getEdgeStringBuffer() {
        return encodeIndexed(() => this.edgeStringFeatures);
    }
    getNumberBuffer() {
        return encodeIndexed(() => this.numberFeatures);
    }
    getBoolBuffer() {
        let max = 0;
        for (const key of Object.keys(this.boolFeatures)) {
            const index = parseInt(key, 10);
            if (index > max)
                max = index;
        }
        const bytes = new Uint8Array((Math.floor(max / 32) + 1) * 5);
        for (const key of Object.keys(this.boolFeatures)) {
            const index = parseInt(key, 10);
            if (index % 32 === 0)
                bytes[Math.floor(index / 32)] = Math.floor(index / 8);
            if (this.boolFeatures[index]) {
                const at = 5 * (Math.floor(index / 32) + 1) - Math.floor((index % 32) / 8) - 1;
                bytes[at] = bytes[at] | (1 << (index % 8));
            }
        }
        return bytes;
    }
    getResult() {
        const central = this.getCentralStringBuffer(), edge = this.getEdgeStringBuffer();
        const number = this.getNumberBuffer(), bool = this.getBoolBuffer();
        const centralHeader = new Uint8Array(1), edgeHeader = new Uint8Array(1);
        centralHeader[0] =
            (this.reserved << 6) |
                (this.dTraitType << 5) |
                (this.centralAccessType << 4) |
                this.version;
        edgeHeader[0] =
            (this.reserved << 6) |
                (this.dTraitType << 5) |
                (this.edgeAccessType << 4) |
                this.version;
        const c = this.context
            .getCryptoUtil()
            ?.bufferConcat([centralHeader, bool, number, central]);
        const e = this.context
            .getCryptoUtil()
            ?.bufferConcat([centralHeader, bool, number, edge]);
        const base64 = (bytes) => this.context.btoa(String.fromCharCode.apply(String, bytes));
        return { centralString: base64(c), edgeString: base64(e) };
    }
}
//# sourceMappingURL=desktop-dtrait-features.js.map