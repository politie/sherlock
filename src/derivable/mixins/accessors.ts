export abstract class ValueAccessor<V> {
    abstract get(): V;
    abstract set(newValue: V): void;

    /**
     * `#value` is an alias for the `#get()` and `#set()` methods on the Atom.
     * Getting `#value` will call `#get()` and return the value.
     * Setting `#value` will call `#set()` with the new value.
     */
    get value() { return this.get(); }
    set value(newValue: V) { this.set(newValue); }
}

export abstract class ValueGetter<V> {
    abstract get(): V;

    /**
     * `#value` is an alias for the `#get()` method on the Derivable.
     * Getting `#value` will call `#get()` and return the value.
     */
    get value() { return this.get(); }
}
