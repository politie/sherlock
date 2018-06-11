import { Derivable, SettableDerivable } from '../derivable.interface';

/**
 * The Derivable implements the `pluck()` method.
 * The output of this method will be a `Derivable`.
 */
export interface ReadonlyPluckable<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: PluckDerivable<V>;
}
export interface PluckDerivable<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): Derivable<V[K]>;
    (key: string | number | Derivable<string | number>): Derivable<any>;
}

/**
 * The Derivable implements the `pluck()` method.
 * The output of this method will be a `SettableDerivable`.
 */
export interface SettablePluckable<V> {
    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: PluckLens<V>;
}
export interface PluckLens<V> {
    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): SettableDerivable<V[K]>;
    (key: string | number | Derivable<string | number>): SettableDerivable<any>;
}
