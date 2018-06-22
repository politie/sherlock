import { unresolved } from './symbols';
import { ErrorWrapper } from './utils';

/**
 * Derivable is the base interface of all variants of Sherlock Derivables.
 *
 * The base Derivable is not settable itself. SettableDerivable is a subtype of Derivable.
 */
export interface Derivable<V> {

    get(): V;

    getOr<T>(fallback: Fallback<T>): V | T;

    fallbackTo<T>(fallback: Fallback<T>): Derivable<V | T>;

    readonly value: V | undefined;

    readonly resolved: boolean;

    readonly errored: boolean;

    readonly error: any;

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
    derive<R, P1>(f: (v: V, p1: P1) => R, p1: Unwrappable<P1>): Derivable<R>;
    derive<R, P1, P2>(f: (v: V, p1: P1, p2: P2) => R, p1: Unwrappable<P1>, p2: Unwrappable<P2>): Derivable<R>;
    derive<R, P>(f: (v: V, ...ps: P[]) => R, ...ps: Array<Unwrappable<P>>): Derivable<R>;

    /**
     * Create a derivation that plucks the property with the given key of the current value of the Derivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck<K extends keyof V>(key: Unwrappable<K>): Derivable<V[K]>;
    pluck(key: Unwrappable<string | number>): Derivable<any>;

    /**
     * Combine this derivable with another Derivable or value using the `&&` operator on the values. Returns another Derivable.
     */
    and<W>(other: Unwrappable<W>): Derivable<V | W>;

    /**
     * Combine this derivable with another Derivable or value using the `||` operator on the values. Returns another Derivable.
     */
    or<W>(other: Unwrappable<W>): Derivable<V | W>;

    /**
     * Create a Derivation of this Derivable using the `!` operator on the value.
     */
    not(): Derivable<boolean>;

    /**
     * Compares the value of this Derivable to the given value or the value of the given derivable using the same `equals` rules
     * that are used for determining state changes.
     */
    is(other: Unwrappable<any>): Derivable<boolean>;

    /**
     * Sets this Derivable to autoCache mode. This will cache the value of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The value is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache(): this;

    /**
     * React on changes of the this derivable. Will continue to run indefinitely until either garbage collected or limited by
     * the provided lifecycle options. Returns a callback function that can be used to stop the reactor indefinitely.
     *
     * @param reaction function to call on each reaction
     * @param options lifecycle options
     */
    react(reaction: (value: V) => void, options?: Partial<ReactorOptions<V>>): () => void;

    /**
     * Returns a promise that resolves with the first value that passes the lifecycle options. Reject on any error in an upstream
     * derivable.
     *
     * @param options lifecycle options
     */
    toPromise(options?: Partial<ToPromiseOptions<V>>): Promise<V>;
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
    value: V | undefined;

    /**
     * Create a new Lens using the provided deriver (get) and transform (set) functions.
     *
     * @param descriptor the deriver (get) and transform (set) functions
     */
    lens<W>(descriptor: TargetedLensDescriptor<V, W, never>): SettableDerivable<W>;
    lens<W, P1>(descriptor: TargetedLensDescriptor<V, W, P1>, p1: Unwrappable<P1>): SettableDerivable<W>;
    lens<W, P1, P2>(descriptor: TargetedLensDescriptor<V, W, P1 | P2>, p1: Unwrappable<P1>, p2: Unwrappable<P2>): SettableDerivable<W>;
    lens<W, P>(descriptor: TargetedLensDescriptor<V, W, P>, ...ps: Array<Unwrappable<P>>): SettableDerivable<W>;

    /**
     * Create a lens that plucks the property with the given key of the current value of the SettableDerivable.
     *
     * @param key the key or derivable to a key that should be used to dereference the current value
     */
    pluck<K extends keyof V>(key: Unwrappable<K>): SettableDerivable<V[K]>;
    pluck(key: Unwrappable<string | number>): SettableDerivable<any>;

    /**
     * Swaps the current value of this atom using the provided swap function. Any additional arguments to this function are
     * fed to the swap function.
     *
     * @param f the swap function
     */
    swap(f: (v: V) => V): void;
    swap<P1>(f: (v: V, p1: P1) => V, p1: Unwrappable<P1>): void;
    swap<P1, P2>(f: (v: V, p1: P1, p2: P2) => V, p1: Unwrappable<P1>, p2: Unwrappable<P2>): void;
    swap<P>(f: (v: V, ...ps: P[]) => V, ...ps: Array<Unwrappable<P>>): void;
    swap(f: (oldValue: V, ...args: any[]) => V, ...args: any[]): void;
}

export interface DerivableAtom {
    unset(): void;
    setError(err: any): void;
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

export type ReactorOptionValue<V> = Unwrappable<boolean> | ((d: Derivable<V>) => Unwrappable<boolean>);

/**
 * The lifecycle options that can be used when creating a new Reactor.
 */
export interface ReactorOptions<V> {
    /**
     * Indicates when the reactor should become active. The reactor is started when `from` becomes true. After that `from` is
     * not observed anymore.
     */
    from: ReactorOptionValue<V>;

    /**
     * Indicates when the reactor should stop. The reactor is stopped indefinitely when `until` becomes false.
     */
    until: ReactorOptionValue<V>;

    /**
     * Indicates when the reactor should react, starts and stops the reactor whenever the value changes. The first time
     * `when` becomes true, `skipFirst` is respected if applicable. After that the reactor will fire each time `when` becomes
     * true.
     */
    when: ReactorOptionValue<V>;

    /**
     * When `true` the reactor will fire only once, after which it will stop indefinitely.
     */
    once: boolean;

    /**
     * When `true` the reactor will not react the first time it would normally react. After that it has no effect.
     */
    skipFirst: boolean;

    /**
     * An errorhandler that gets called when an error is thrown in any upstream derivation or the reactor itself. Any
     * error will stop the reactor.
     */
    onError?(error: any): void;
}

export type ToPromiseOptions<V> = Pick<ReactorOptions<V>, 'from' | 'until' | 'when' | 'skipFirst'>;

export declare type Unwrappable<T> = T | Derivable<T>;

export type Fallback<T> = Unwrappable<T> | (() => T);

export type State<V> = V | typeof unresolved | ErrorWrapper;
