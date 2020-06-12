const _isLittleEndian = true;
const _int32 = new Int32Array(2);
const _float32 = new Float32Array(_int32.buffer);
const _float64 = new Float64Array(_int32.buffer);

export class Reader {
    protected offset = 0;
    constructor(readonly datas: number[]) {}

    public uint8(): number {
        return this.datas[this.offset++];
    }

    public bool(): boolean {
        return this.int8() > 1;
    }

    public int8(): number {
        return (this.uint8() << 24) >> 24;
    }

    public uint16(): number {
        return this.datas[this.offset++] | (this.datas[this.offset++] << 8);
    }

    public int16(): number {
        return (this.uint16() << 16) >> 16;
    }

    public int32(): number {
        return (
            this.datas[this.offset++] |
            (this.datas[this.offset++] << 8) |
            (this.datas[this.offset++] << 16) |
            (this.datas[this.offset++] << 24)
        );
    }

    public uint32(): number {
        return this.int32() >>> 0;
    }

    public int64() {
        const low = this.uint32();
        const high = this.uint32() * Math.pow(2, 32);
        return high + low;
    }

    public uint64() {
        const low = this.uint32();
        const high = this.uint32() * Math.pow(2, 32);
        return high + low;
    }

    public float32() {
        _int32[0] = this.int32();
        return _float32[0];
    }

    public float64() {
        _int32[_isLittleEndian ? 0 : 1] = this.int32();
        _int32[_isLittleEndian ? 1 : 0] = this.int32();
        return _float64[0];
    }

    public length() {
        const prefix = this.uint8();
        if (prefix < 0xc0) {
            return prefix & 0x1f;
        } else if (prefix === 0xd9) {
            return this.uint8();
        } else if (prefix === 0xda) {
            return this.uint16();
        } else if (prefix === 0xdb) {
            return this.uint32();
        }
        return 0;
    }

    public utf8(): string {
        const length = this.length();
        let string = "",
            chr = 0;
        for (let i = this.offset, end = this.offset + length; i < end; i++) {
            let byte = this.datas[i];
            if ((byte & 0x80) === 0x00) {
                string += String.fromCharCode(byte);
                continue;
            }
            if ((byte & 0xe0) === 0xc0) {
                string += String.fromCharCode(
                    ((byte & 0x1f) << 6) | (this.datas[++i] & 0x3f)
                );
                continue;
            }
            if ((byte & 0xf0) === 0xe0) {
                string += String.fromCharCode(
                    ((byte & 0x0f) << 12) |
                        ((this.datas[++i] & 0x3f) << 6) |
                        ((this.datas[++i] & 0x3f) << 0)
                );
                continue;
            }
            if ((byte & 0xf8) === 0xf0) {
                chr =
                    ((byte & 0x07) << 18) |
                    ((this.datas[++i] & 0x3f) << 12) |
                    ((this.datas[++i] & 0x3f) << 6) |
                    ((this.datas[++i] & 0x3f) << 0);
                if (chr >= 0x010000) {
                    // surrogate pair
                    chr -= 0x010000;
                    string += String.fromCharCode(
                        (chr >>> 10) + 0xd800,
                        (chr & 0x3ff) + 0xdc00
                    );
                } else {
                    string += String.fromCharCode(chr);
                }
                continue;
            }
            throw new Error("Invalid byte " + byte.toString(16));
        }
        this.offset += length;
        return string;
    }

    public bytes(): number[] {
        const length = this.length();
        const bytes = this.datas.slice(this.offset, this.offset + length);
        this.offset += length;
        return bytes;
    }

    public isEnd() {
        return this.offset >= this.datas.length;
    }
}
