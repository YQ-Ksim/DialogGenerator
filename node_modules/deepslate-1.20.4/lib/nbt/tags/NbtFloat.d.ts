import type { JsonValue } from '../../util/index.js';
import type { DataInput, DataOutput } from '../io/index.js';
import { NbtTag } from './NbtTag.js';
import { NbtType } from './NbtType.js';
export declare class NbtFloat extends NbtTag {
    private readonly value;
    constructor(value: number);
    getId(): NbtType;
    getAsNumber(): number;
    toString(): string;
    toPrettyString(): string;
    toSimplifiedJson(): number;
    toJson(): number;
    toBytes(output: DataOutput): void;
    static create(): NbtFloat;
    static fromJson(value: JsonValue): NbtFloat;
    static fromBytes(input: DataInput): NbtFloat;
}
//# sourceMappingURL=NbtFloat.d.ts.map