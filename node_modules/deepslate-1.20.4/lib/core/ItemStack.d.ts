import { NbtCompound } from '../nbt/index.js';
import { Identifier } from './Identifier.js';
import { Item } from './world/Item.js';
export declare class ItemStack {
    id: Identifier;
    count: number;
    tag: NbtCompound;
    private item;
    constructor(id: Identifier, count: number, tag?: NbtCompound);
    getItem(): Item;
    clone(): ItemStack;
    is(other: string | Identifier | ItemStack): boolean;
    equals(other: unknown): boolean;
    toString(): string;
}
//# sourceMappingURL=ItemStack.d.ts.map