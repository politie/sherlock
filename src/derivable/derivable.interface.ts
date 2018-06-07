import { AutoCacheable, TrackedObservable } from '../tracking';
import {
    AtomPluck, AtomPluckable, BooleanDerivable, CanDerive, DerivablePluckable, Gettable, Lensable, Settable, Swappable,
} from './mixins/interfaces';

export interface Derivable<V> extends
    TrackedObservable,
    AutoCacheable,
    CanDerive<V>,
    Gettable<V>,
    BooleanDerivable<V>,
    DerivablePluckable<V> { }

/**
 * SettableDerivable is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export interface SettableDerivable<V> extends
    Derivable<V>,
    AtomPluckable<V>,
    Lensable<V>,
    Swappable<V>,
    Settable<V> {

    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: AtomPluck<V>;

    /**
     * `#value` is an alias for the `#get()` and `#set()` methods on the Atom.
     * Getting `#value` will call `#get()` and return the value.
     * Setting `#value` will call `#set()` with the new value.
     */
    value: V;
}
