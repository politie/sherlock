export interface Gettable<V> {
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