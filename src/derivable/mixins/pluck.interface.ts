import { SettableDerivable, Derivable } from '../interfaces';

export interface DerivablePluckable<V> {
    pluck: DerivablePluck<V>;
}
export interface DerivablePluck<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): Derivable<V[K]>;
    (key: string | number | Derivable<string | number>): Derivable<any>;
}

export interface AtomPluckable<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: AtomPluck<V>;
}
export interface AtomPluck<V> {
    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    <K extends keyof V>(key: K | Derivable<K>): SettableDerivable<V[K]>;
    (key: string | number | Derivable<string | number>): SettableDerivable<any>;
}
