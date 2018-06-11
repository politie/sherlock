import { AutoCacheable, TrackedObservable } from '../tracking';
import {
    BooleanDerivable, CanDerive, Gettable, Lensable, PluckLens, ReadonlyPluckable, Settable, SettablePluckable, Swappable,
} from './mixins/interfaces';

/**
 * Derivable is the base interface of any Sherlock class.
 *
 * The base Derivable is not settable itself, but the SettableDerivable is a superset of this interface.
 */
export interface Derivable<V> extends
    TrackedObservable,
    AutoCacheable,
    CanDerive<V>,
    Gettable<V>,
    BooleanDerivable<V>,
    ReadonlyPluckable<V> { }

/**
 * SettableDerivable is a Derivable that is settable.
 *
 * The most notable of these is the Atom.
 */
export interface SettableDerivable<V> extends
    Derivable<V>,
    SettablePluckable<V>,
    Lensable<V>,
    Swappable<V>,
    Settable<V> {

    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck: PluckLens<V>;

    /**
     * `#value` is an alias for the `#get()` and `#set()` methods on the Atom.
     * Getting `#value` will call `#get()` and return the value.
     * Setting `#value` will call `#set()` with the new value.
     */
    value: V;
}
