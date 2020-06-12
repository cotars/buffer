import { MetaModel, Type, MetaField } from "./common";
import { Model, Typed } from "./decorator";
import { deserialize } from "./deserialize";

export function bufferToObject<T>(buffer: number[], meta: MetaModel): Partial<T> {
    const data = deserialize(buffer);
    const object = new Object();
    meta.fields.forEach((f) => {
        if (!data[f.tag]) {
            return;
        }
        if (f.type == Type.MODEL) {
            if (!f.model) {
                throw new Error("field not defined!");
            }
            object[f.name] = bufferToObject(data[f.tag], f.model);
        } else {
            object[f.name] = data[f.tag];
        }
    });
    return object as any;
}

function transformValue(
    target: { data: Object; key: string | number },
    source: { data: Object; key: string | number },
    field: MetaField,
    model: Model
) {
    switch (field.type) {
        case Type.MODEL:
            if (!field.model) {
                throw new Error("field not defined!");
            }
            const subModelCtor = Typed.getModel(
                model.constructor as typeof Model,
                field.tag
            );
            if (!(target.data[target.key] instanceof subModelCtor)) {
                target.data[target.key] = new subModelCtor();
            }
            bufferObjectToExistsModel(
                target.data[target.key],
                source.data[source.key]
            );
            break;
        case Type.MAP:
            if (!(target.data[target.key] instanceof Map)) {
                target.data[target.key] = new Map();
            }
            Object.keys(source.data[source.key]).forEach(k => {
                let mapKey = field.mapKeyWithString ? k : Number(k);
                target.data[target.key].set(mapKey, source.data[source.key][mapKey]);
            });
            break;
        default:
            target.data[target.key] = source.data[source.key];
    }
}

export function bufferObjectToExistsModel<T extends Model>(
    model: T,
    object: Object
): T {
    const meta = Typed.meta(model.constructor as typeof Model);
    if (!object) {
        return model;
    }
    meta.fields.forEach((field) => {
        if (!object[field.tag]) {
            return;
        }
        if (field.repeated) {
            object[field.tag] = Array.isArray(object[field.tag])
                ? object[field.tag]
                : [];
            if (!Array.isArray(model[field.name])) {
                model[field.name] = [];
            }
            (object[field.tag] as []).forEach((v, i) => {
                transformValue(
                    { data: model[field.name], key: i },
                    { data: object[field.tag], key: i },
                    field,
                    model
                );
            });
        } else {
            transformValue(
                { data: model, key: field.name },
                { data: object, key: field.tag },
                field,
                model
            );
        }
    });
    return model;
}

export function bufferToExistModel<T extends Model>(model: T, buffer: number[]): T {
    const data = deserialize(buffer);
    return bufferObjectToExistsModel(model, data);
}

export function bufferToModel<T extends Model>(
    model: new (...args: any[]) => T,
    buffer: number[]
): T {
    return bufferToExistModel(new model(), buffer);
}
