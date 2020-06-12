const _isLittleEndian = true;
const _int32 = new Int32Array(2);
const _float32 = new Float32Array(_int32.buffer);
const _float64 = new Float64Array(_int32.buffer);

type Utf8StringInfo = {
    length: number;
    codes: number[];
};

export function utf8Meta(str: string): Utf8StringInfo {
    const resp: Utf8StringInfo = { length: 0, codes: [] };
    for (var i = 0, l = str.length; i < l; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) {
            resp.length += 1;
            resp.codes.push(c);
        } else if (c < 0x800) {
            resp.length += 2;
            resp.codes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c < 0xd800 || c >= 0xe000) {
            resp.length += 3;
            resp.codes.push(
                0xe0 | (c >> 12),
                0x80 | ((c >> 6) & 0x3f),
                0x80 | (c & 0x3f)
            );
        } else {
            i++;
            resp.length += 4;
            c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            resp.codes.push(
                0xf0 | (c >> 18),
                0x80 | ((c >> 12) & 0x3f),
                0x80 | ((c >> 6) & 0x3f),
                0x80 | (c & 0x3f)
            );
        }
    }
    return resp;
}

export class Writer {
    readonly datas: Array<number> = [];
    public int8(v: number) {
        this.datas.push(v & 255);
    }

    public int16(v: number) {
        this.datas.push(v & 255);
        this.datas.push((v >> 8) & 255);
    }

    public int32(v: number) {
        this.datas.push(v & 255);
        this.datas.push((v >> 8) & 255);
        this.datas.push((v >> 16) & 255);
        this.datas.push((v >> 24) & 255);
    }

    public write64(v: number) {
        const high = Math.floor(v / Math.pow(2, 32));
        const low = v >>> 0;
        this.int32(low);
        this.int32(high);
    }

    public float32(v: number) {
        _float32[0] = v;
        this.int32(_int32[0]);
    }

    public float64(v: number) {
        _float64[0] = v;
        this.int32(_int32[_isLittleEndian ? 0 : 1]);
        this.int32(_int32[_isLittleEndian ? 1 : 0]);
    }

    public length(length: number) {
        if (length < 0x20) {
            this.int8(length | 0xa0);
        } else if (length < 0x100) {
            this.int8(0xd9);
            this.int8(length);
        } else if (length < 0x10000) {
            this.int8(0xda);
            this.int16(length);
        } else if (length < 0x100000000) {
            this.int8(0xdb);
            this.int32(length);
        } else {
            throw new Error("String too long");
        }
    }

    public utf8(str: string) {
        const Meta = utf8Meta(str);
        this.length(Meta.length);
        this.datas.push(...Meta.codes);
    }
    public writeBytes(bytes: Array<number>, withoutLength: boolean = false) {
        !withoutLength && this.length(bytes.length);
        this.datas.push(...bytes);
    }
}