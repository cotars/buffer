import {
    MetaModel,
    Type,
    MetaField,
    FLAG_REPEATED,
    FLAG_MAP_KEY_STRING,
} from "./common";
import { Reader } from "./reader";

function readValue(reader: Reader, flag: number): any {
    const isMapKeyString = (flag & FLAG_MAP_KEY_STRING) > 0;
    const type: Type = flag & 0x1f;

    switch (type) {
        case Type.STR:
            return reader.utf8();
        case Type.BOOL:
            return reader.bool();
        case Type.INT8:
            return reader.int8();
        case Type.UINT8:
            return reader.uint8();
        case Type.INT16:
            return reader.int16();
        case Type.UINT16:
            return reader.uint16();
        case Type.INT32:
            return reader.int32();
        case Type.UINT32:
            return reader.uint32();
        case Type.ENUM:
            return reader.uint32();
        case Type.INT64:
            return reader.int64();
        case Type.UINT64:
            return reader.uint64();
        case Type.FLOAT32:
            return reader.float32();
        case Type.FLOAT64:
            return reader.float64();
        case Type.BYTES:
            return reader.bytes();

        case Type.MODEL:
            const bytes = reader.bytes();
            return readModel(bytes);
        case Type.MAP:
            const mapSize = reader.uint16();
            const mapValues = {};
            for (let i = 0; i < mapSize; i++) {
                if (isMapKeyString) {
                    mapValues[reader.utf8()] = readEachValue(reader).values;
                } else {
                    mapValues[reader.int32()] = readEachValue(reader).values;
                }
            }
            return mapValues;
        default:
            throw new Error(`data type(${type}) unpack error`);
    }
}

function readModel(buffer: number[]) {
    const reader = new Reader(buffer);
    const values = {};
    // const tag = reader.uint32();
    while (!reader.isEnd()) {
        const readed = readEachValue(reader);
        values[readed.tag] = readed.values;
    }
    return values;
}

function readEachValue(reader: Reader) {
    const tag = reader.uint16();
    const flag = reader.uint8();
    const isRepeated = (flag & FLAG_REPEATED) > 0;
    if (isRepeated) {
        const values: any = [];
        const length = reader.uint16();
        for (let i = 0; i < length; i++) {
            values.push(readValue(reader, flag));
        }
        return { tag, values };
    }
    return { tag, values: readValue(reader, flag) };
}

export function transform<T>(data: Object, meta: MetaModel): Partial<T> {
    const object = new Object();
    meta.fields.forEach((f) => {
        if (!data[f.tag]) {
            return;
        }
        if (f.type == Type.MODEL) {
            if (!f.model) {
                throw new Error("field not defined!");
            }
            object[f.name] = transform(data[f.tag], f.model);
        } else {
            object[f.name] = data[f.tag];
        }
    });
    return object as any;
}

export function deserialize(buffer: number[]): Object {
    const data = readModel(buffer);
    return data as Object;
}
