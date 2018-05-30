export interface Gettable<V> {
    /**
     * Indicates if the set() method is implemented and will return a value.
     */
    readonly settable: boolean;

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    get(): V;

    /**
     * `#value` is an alias for the `#get()` method on the Derivable.
     * Getting `#value` will call `#get()` and return the value.
     */
    readonly value: V;
}

// Cannot override with `settable:true` because `DataSource` implements `Settable` but can be read only
export interface Settable<V> extends Gettable<V> {
    /**
     * Sets the value of this atom, fires reactors when expected.
     *
     * @param newValue the new state
     */
    set(newValue: V): void;

    /**
     * `#value` is an alias for the `#get()` and `#set()` methods on the Atom.
     * Getting `#value` will call `#get()` and return the value.
     * Setting `#value` will call `#set()` with the new value.
     */
    value: V;
}
