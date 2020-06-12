import { Type, MetaField, MetaModel } from "./common";

export class Model {}

type DefinedMeta = {
    type: Type;
    repeated?: boolean;
    name?: string;
    tag?: number;
    ref?: Object;
    model?: typeof Model;
    mapValueField?: DefinedMeta;
    mapKeyWithString?: boolean;
};

type NoramlType =
    | Type.STR
    | Type.BOOL
    | Type.INT8
    | Type.UINT8
    | Type.INT16
    | Type.UINT16
    | Type.INT32
    | Type.UINT32
    | Type.INT64
    | Type.UINT64
    | Type.FLOAT32
    | Type.BYTES
    | Type.FLOAT64;

export class TypeDefined {
    public readonly fieldMetaMap: Map<typeof Model, DefinedMeta[]> = new Map();
    public readonly modelNS: Map<typeof Model, string> = new Map();
    public readonly modelMetaCache: Map<typeof Model, MetaModel> = new Map();

    field(
        tag: number,
        type: NoramlType,
        repeated?: boolean
    ): PropertyDecorator {
        return this.field_({ tag, type, repeated });
    }

    enum(tag: number, ref: Object, repeated?: boolean): PropertyDecorator {
        return this.field_({
            tag,
            type: Type.ENUM,
            repeated,
            ref,
        });
    }

    map(
        tag: number,
        meta: DefinedMeta,
        useStringKey?: boolean,
        repeated?: boolean
    ): PropertyDecorator {
        return this.field_({
            tag,
            type: Type.MAP,
            repeated,
            mapKeyWithString: useStringKey,
            mapValueField: meta,
        });
    }

    model(
        tag: number,
        model: typeof Model,
        repeated?: boolean
    ): PropertyDecorator {
        return this.field_({ tag, type: Type.MODEL, repeated, model });
    }

    protected field_(meta: DefinedMeta): PropertyDecorator {
        return (target: Object, key: string | Symbol) => {
            const modelCls = target.constructor as typeof Model;
            if (!this.fieldMetaMap.has(modelCls)) {
                this.fieldMetaMap.set(modelCls, []);
            }
            const fields = this.fieldMetaMap.get(modelCls) as DefinedMeta[];
            if (this.checkFieldExists(modelCls, meta)) {
                throw new Error("model field bean defined");
            }
            meta.name = String(key);
            meta.repeated = meta.repeated || false;
            meta.mapKeyWithString = meta.mapKeyWithString || false;
            fields.push(meta);
        };
    }

    protected checkFieldExists(
        target: typeof Model,
        metadata: DefinedMeta
    ): boolean {
        const prototypeOf = Object.getPrototypeOf(target);
        if (!target || typeof target == "object") {
            return false;
        }
        const prototypeOfExists = this.checkFieldExists(prototypeOf, metadata);
        if (prototypeOfExists) {
            return true;
        }

        if (this.fieldMetaMap.has(target)) {
            const fields = this.fieldMetaMap.get(target) as DefinedMeta[];
            const exists = fields.find((v) => v.tag == metadata.tag);
            return exists ? true : false;
        }
        return false;
    }

    ns(namespace: string): ClassDecorator {
        return (taget: Function) => {
            this.modelNS.set(taget as typeof Model, namespace);
        };
    }

    getModel(model: typeof Model, tag: number): typeof Model {
        let target = model;
        do {
            if (this.fieldMetaMap.has(target)) {
                return this.fieldMetaMap.get(target).find((v) => v.tag == tag)
                    .model;
            }
            target = Object.getPrototypeOf(target);
        } while (target && typeof target !== "object");
        return;
    }

    protected definedToMeta(defined: DefinedMeta): MetaField {
        const fieldMeta: MetaField = {
            type: defined.type,
            tag: defined.tag,
            repeated: defined.repeated,
            name: defined.name,
            mapKeyWithString: defined.mapKeyWithString,
        };
        if (defined.mapValueField) {
            fieldMeta.mapValueField = this.definedToMeta(defined.mapValueField);
        }
        if (defined.model) {
            fieldMeta.model = this.meta(defined.model);
        }
        return fieldMeta;
    }

    meta(model: typeof Model): MetaModel {
        if (this.modelMetaCache.has(model)) {
            return this.modelMetaCache.get(model);
        }
        const ns = this.modelNS.get(model);
        const name = model.name;
        const meta: MetaModel = { ns, name, fields: [] };
        let target = model;
        do {
            if (this.fieldMetaMap.has(target)) {
                this.fieldMetaMap
                    .get(target)
                    .forEach((v) => meta.fields.push(this.definedToMeta(v)));
            }
            target = Object.getPrototypeOf(target);
        } while (target && typeof target !== "object");
        this.modelMetaCache.set(model, meta);
        return meta;
    }

    print() {
        console.dir(this.fieldMetaMap);
        console.dir(this.modelNS);
    }
}

export const Typed = new TypeDefined();
