/**
 * All Derivables implement `get()` method and readonly `value` getter.
 */
export interface Gettable<V> {
    /**
     * Indicates whether the `set()` method is implemented and whether it will accept a value.
     */
    readonly settable: boolean;

    /**
     * Returns the current value of this Derivable. Automatically records the use of this Derivable when inside a Derivation.
     */
    get(): V;

    /**
     * `#value` is an alternative to the use of the `#get()` method on the Derivable. Getting `#value` is equivalent to calling
     * `#get()`. Automatically records the use of this Derivable when inside a Derivation.
     */
    readonly value: V;
}

/**
 * SettableDerivables implement `get()` and `set()` methods and `value` getter/setter.
 */
export interface Settable<V> extends Gettable<V> {
    /**
     * Sets the value of this SettableDerivable, firing reactors if needed.
     *
     * @param newValue the new state
     */
    set(newValue: V): void;

    /**
     * `#value` is an alternative to the use of the `#get()` and `#set()` methods on the SettableDerivable. Getting `#value`
     * will call `#get()` and return the value. Setting `#value` will call `#set()` with the new value.
     */
    value: V;
}
