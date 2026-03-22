import { Identifier } from '../core/index.js';
import type { BlockModelProvider } from './BlockModel.js';
import { Cull } from './Cull.js';
import { Mesh } from './Mesh.js';
import type { TextureAtlasProvider } from './TextureAtlas.js';
declare type ModelVariant = {
    model: string;
    x?: number;
    y?: number;
    uvlock?: boolean;
};
declare type ModelVariantEntry = ModelVariant | (ModelVariant & {
    weight?: number;
})[];
declare type ModelMultiPartCondition = {
    OR: ModelMultiPartCondition[];
} | {
    [key: string]: string;
};
declare type ModelMultiPart = {
    when?: ModelMultiPartCondition;
    apply: ModelVariantEntry;
};
export interface BlockDefinitionProvider {
    getBlockDefinition(id: Identifier): BlockDefinition | null;
}
export declare class BlockDefinition {
    private readonly id;
    private readonly variants;
    private readonly multipart;
    constructor(id: Identifier, variants: {
        [key: string]: ModelVariantEntry;
    } | undefined, multipart: ModelMultiPart[] | undefined);
    getModelVariants(props: {
        [key: string]: string;
    }): ModelVariant[];
    getMesh(name: Identifier, props: {
        [key: string]: string;
    }, textureUVProvider: TextureAtlasProvider, blockModelProvider: BlockModelProvider, cull: Cull): Mesh;
    private matchesVariant;
    private matchesCase;
    static fromJson(id: string, data: any): BlockDefinition;
}
export {};
//# sourceMappingURL=BlockDefinition.d.ts.map