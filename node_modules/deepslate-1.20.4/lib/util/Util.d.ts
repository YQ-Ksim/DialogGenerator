export declare function lazy<T>(getter: () => T): () => T;
export declare function computeIfAbsent<K, V>(map: Map<K, V>, key: K, getter: (key: K) => V): V;
export declare function mutateWithDefault<K, V>(map: Map<K, V>, key: K, initialValue: V, mutator: (value: V, key: K) => void): V;
export declare type Color = [number, number, number];
export declare function intToRgb(n: number): Color;
//# sourceMappingURL=Util.d.ts.map