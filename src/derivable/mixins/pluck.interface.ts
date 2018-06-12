import { Derivable, SettableDerivable } from '../derivable.interface';

/**
 * Derivables implement the `pluck()` method with a return type of `Derivable`.
 */
export interface Pluckable<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: PluckMethod<V>;
}

export interface PluckMethod<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): Derivable<V[K]>;
    (key: string | number | Derivable<string | number>): Derivable<any>;
}

/**
 * SettableDerivables implement the `pluck()` method with a return type of `SettableDerivable`.
 */
export interface SettablePluckable<V> {
    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: SettablePluckMethod<V>;
}

export interface SettablePluckMethod<V> {
    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): SettableDerivable<V[K]>;
    (key: string | number | Derivable<string | number>): SettableDerivable<any>;
}
