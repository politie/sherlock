import { BaseDerivable } from './base-derivable';

/**
 * Derivable is the base interface of all variants of Sherlock Derivables.
 *
 * The base Derivable is not settable itself. SettableDerivable is a subtype of Derivable.
 */
export interface Derivable<V> {

    /**
     * Returns the current value of this Derivable. Automatically records the use of this Derivable when inside a Derivation.
     */
    get(): V;

    /**
     * `#value` is an alternative to the use of the `#get()` method on the Derivable. Getting `#value` is equivalent to calling
     * `#get()`. Automatically records the use of this Derivable when inside a Derivation.
     */
    readonly value: V;

    /**
     * Indicates whether the `set()` method is implemented and whether it will accept a value.
     */
    readonly settable: boolean;

    /**
     * Create a derivation based on this Derivable and the given deriver function.
     *
     * @param f the deriver function
     */
    derive<R>(f: (v: V) => R): Derivable<R>;
    derive<R, P1>(f: (v: V, p1: P1) => R, p1: P1 | Derivable<P1>): Derivable<R>;
    derive<R, P1, P2>(f: (v: V, p1: P1, p2: P2) => R, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
    derive<R, P>(f: (v: V, ...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R>;

    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck<K extends keyof V>(key: K | Derivable<K>): Derivable<V[K]>;
    pluck(key: string | number | Derivable<string | number>): Derivable<any>;

    /**
     * Combine this derivable with another Derivable or value using the `&&` operator on the values. Returns another Derivable.
     */
    and<W>(other: Derivable<W> | W): Derivable<V | W>;

    /**
     * Combine this derivable with another Derivable or value using the `||` operator on the values. Returns another Derivable.
     */
    or<W>(other: Derivable<W> | W): Derivable<V | W>;

    /**
     * Create a Derivation of this Derivable using the `!` operator on the value.
     */
    not(): Derivable<boolean>;

    /**
     * Compares the value of this Derivable to the given value or the value of the given derivable using the same `equals` rules
     * that are used for determining state changes.
     */
    is(other: Derivable<any> | any): Derivable<boolean>;

    /**
     * Sets this Derivable to autoCache mode. This will cache the value of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The value is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache(): this;
}

/**
 * SettableDerivable is a Derivable that is settable. Atoms, Lenses and DataSources can be settable.
 */
export interface SettableDerivable<V> extends Derivable<V> {

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

    /**
     * Create a new Lens using the provided deriver (get) and transform (set) functions.
     *
     * @param descriptor the deriver (get) and transform (set) functions
     */
    lens<W>(descriptor: TargetedLensDescriptor<V, W, never>): SettableDerivable<W>;
    lens<W, P1>(descriptor: TargetedLensDescriptor<V, W, P1>, p1: P1 | Derivable<P1>): SettableDerivable<W>;
    lens<W, P1, P2>(descriptor: TargetedLensDescriptor<V, W, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): SettableDerivable<W>;
    lens<W, P>(descriptor: TargetedLensDescriptor<V, W, P>, ...ps: Array<P | Derivable<P>>): SettableDerivable<W>;

    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck<K extends keyof V>(key: K | Derivable<K>): SettableDerivable<V[K]>;
    pluck(key: string | number | Derivable<string | number>): SettableDerivable<any>;

    /**
     * Swaps the current value of this atom using the provided swap function. Any additional arguments to this function are
     * fed to the swap function.
     *
     * @param f the swap function
     */
    swap(f: (v: V) => V): void;
    swap<P1>(f: (v: V, p1: P1) => V, p1: P1 | Derivable<P1>): void;
    swap<P1, P2>(f: (v: V, p1: P1, p2: P2) => V, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): void;
    swap<P>(f: (v: V, ...ps: P[]) => V, ...ps: Array<P | Derivable<P>>): void;
    swap(f: (oldValue: V, ...args: any[]) => V, ...args: any[]): void;
}

/**
 * Returns true iff the provided `derivable` is a Derivable.
 *
 * @param derivable the object to test
 */
export function isDerivable<V>(derivable: Derivable<V>): derivable is Derivable<V>;
export function isDerivable(obj: any): obj is Derivable<any>;
export function isDerivable(derivable: any) {
    return derivable instanceof BaseDerivable;
}

/**
 * Returns true iff the provided `derivable` is a SettableDerivable.
 *
 * @param derivable the object to test
 */
export function isSettableDerivable<V>(derivable: Derivable<V>): derivable is SettableDerivable<V>;
export function isSettableDerivable(obj: any): obj is SettableDerivable<any>;
export function isSettableDerivable(derivable: any) {
    return isDerivable(derivable) && derivable.settable;
}

/**
 * A description of a derived lens that automatically uses the {@link SettableDerivable#get} and {@link SettableDerivable#set} functions
 * with the provided deriver (get) and transform (set) functions. Can be used with the {@link SettableDerivable#lens} function to create
 * a new Lens.
 */
export interface TargetedLensDescriptor<T, V, P> {
    get(targetValue: T, ...ps: P[]): V;
    set(newValue: V, targetValue: T, ...ps: P[]): T;
}

/**
 * A description of a standalone lens with arbitrary dependencies. Can be used with the {@link lens} function
 * to create a new Lens.
 */
export interface StandaloneLensDescriptor<V, P> {
    get(...ps: P[]): V;
    set(newValue: V, ...ps: P[]): void;
}
