import {
    MetaModel,
    Type,
    FLAG_REPEATED,
    FLAG_MAP_KEY_STRING,
    MetaField,
} from "./common";
import { Writer } from "./writer";

function writeValue(writer: Writer, field: MetaField, val: any) {
    switch (field.type) {
        case Type.STR:
            writer.utf8(val);
            break;
        case Type.BOOL:
        case Type.INT8:
        case Type.UINT8:
            writer.int8(Number(val));
            break;
        case Type.INT16:
        case Type.UINT16:
            writer.int16(Number(val));
            break;
        case Type.ENUM:
        case Type.INT32:
        case Type.UINT32:
            writer.int32(Number(val));
            break;
        case Type.INT64:
        case Type.UINT64:
            writer.write64(Number(val));
            break;
        case Type.FLOAT32:
            writer.float32(Number(val));
            break;
        case Type.FLOAT64:
            writer.float64(Number(val));
            break;
        case Type.BYTES:
            writer.writeBytes(val);
            break;
        case Type.MODEL:
            if (!field.model) {
                throw new Error('field model not defined');
            }
            const subPacker = serialize(val, field.model);
            writer.writeBytes(subPacker);
            break;
        case Type.MAP:
            if (!field.mapValueField) {
                throw new Error('field mapValueField not defined');
            }
            const kv: any[] = [];
            const map: Map<any, any> = val;
            map.forEach((v, k) => {
                if (v) {
                    kv.push([k, v]);
                }
            });
            writer.int16(kv.length); //写入长度
            kv.forEach((kv: any) => {
                if (field.mapKeyWithString) {
                    writer.utf8(kv[0]);
                } else {
                    writer.int32(kv[0]);
                }
                writeFiled(writer, field.mapValueField, kv[1]);
            });
            break;
        default:
            throw new Error("uknow type...");
    }
}

function writeFiled(writer: Writer, field: MetaField, val: any) {
    if (!val) {
        return;
    }
    writer.int16(field.tag);
    let flag = field.type;
    if (field.repeated) {
        flag |= FLAG_REPEATED;
    }
    // field: Map<string, Map<number, string>>[]
    if (field.type == Type.MAP && field.mapKeyWithString) {
        flag |= FLAG_MAP_KEY_STRING;
    }
    writer.int8(flag);
    const values: any[] = [];
    if (field.repeated) {
        if (!Array.isArray(val)) {
            throw new Error(`value is not array`);
        }
        if (val.length >= 65535) {
            throw new Error(`max array size(65535)`);
        }
        writer.int16(val.length);
        values.push(...val);
    } else {
        values.push(val);
    }
    values.forEach((v) => writeValue(writer, field, v));
}

export function serialize(model: Object, meta: MetaModel): number[] {
    const writer = new Writer();
    // writer.int32(meta.tag);
    meta.fields.forEach((field) =>
        writeFiled(writer, field, model[field.name])
    );
    return writer.datas;
}
