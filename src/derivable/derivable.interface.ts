import {
    Gettable, HasBooleanMethods, HasDeriveMethod, Lensable, Pluckable, Settable, SettablePluckable, SettablePluckMethod, Swappable,
} from './mixins/interfaces';

/**
 * Derivable is the base interface of all variants of Sherlock Derivables.
 *
 * The base Derivable is not settable itself. SettableDerivable is a subtype of Derivable.
 */
export interface Derivable<V> extends
    AutoCacheable,
    HasDeriveMethod<V>,
    Gettable<V>,
    HasBooleanMethods<V>,
    Pluckable<V> { }

/**
 * SettableDerivable is a Derivable that is settable. Atoms, Lenses and DataSources can be settable.
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
    pluck: SettablePluckMethod<V>;

    /**
     * `#value` is an alias for the `#get()` and `#set()` methods on the Atom.
     * Getting `#value` will call `#get()` and return the value.
     * Setting `#value` will call `#set()` with the new value.
     */
    value: V;
}

export interface AutoCacheable {
    /**
     * Sets this Derivable to autoCache mode. This will cache the value of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The value is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache(): this;
}
