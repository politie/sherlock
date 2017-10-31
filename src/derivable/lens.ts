import { BaseError } from '@politie/informant';
import { atomic } from '../transaction';
import { clone } from '../utils';
import { Atom } from './atom';
import { Derivable } from './derivable';
import { Derivation, hasGetter, plucker } from './derivation';
import { unpack } from './unpack';

/**
 * A Lens is a Derivation that is also settable. It satisfies the Atom interface and can be created using an
 * arbitrary get and set function or as a derivation from another Atom or Lens using a deriver (get) and
 * transform (set) function. The set function is always called inside a transaction (but will not create a new
 * transaction if one is already active) to prevent inconsistent state when an error occurs.
 */
export class Lens<V> extends Derivation<V> implements Atom<V> {
    /**
     * @internal
     * Not used. Only to satisfy Atom<V> interface.
     */
    value: V;

    /**
     * The setter that was provided in the constructor.
     */
    private setter: (newValue: V, ...args: any[]) => void;

    /**
     * Create a new Lens using a get and a set function. The get is used as a normal deriver function
     * including the automatic recording of dependencies, the set is used as a sink for new values.
     *
     * @param param0 the get and set functions
     */
    constructor({ get, set }: LensDescriptor<V, any>, args?: any[]) {
        super(get, args);
        this.setter = set;
    }

    /**
     * Sets the value of this Lens, the set function provided in the constructor is responsible for maintaining
     * the state and should make sure that the next call to `get()` returns the `newValue`.
     *
     * @param newValue the new state
     */
    @atomic()
    set(newValue: V) {
        const { setter, args } = this;
        if (args) {
            setter(newValue, ...args.map(unpack));
        } else {
            setter(newValue);
        }
    }

    /**
     * Swaps the current value of this atom using the provided swap function. Any additional arguments to this function are
     * fed to the swap function.
     *
     * @param f the swap function
     */
    swap(f: (oldValue: V, ...args: any[]) => V, ...args: any[]) {
        this.set(f(this.get(), ...args));
    }

    /**
     * Create a new Lens using the provided deriver (get) and transform (set) functions.
     *
     * @param param0 the deriver (get) and transform (set) functions
     */
    lens<W, P>({ get, set }: MonoLensDescriptor<V, W, P>, ...ps: Array<P | Derivable<P>>): Atom<W> {
        const atom = this;
        return new Lens({
            get,
            set() { atom.set(set.apply(undefined, arguments)); },
        }, [atom, ...ps]);
    }

    // Locally overridden to return an Atom instead of an ordinary Derivable.
    pluck(key: string | number | Derivable<string | number>): Atom<any> {
        return this.lens<V, string | number>({
            get: plucker,
            set: pluckSetter,
        }, key);
    }
}

function pluckSetter(newValue: any, object: any, key: string | number) {
    if (hasGetter(object)) {
        if (hasSetter(object)) {
            return object.set(key, newValue);
        }
        throw new BaseError({ object, newValue, key }, 'object is readonly');
    }
    const result = clone(object);
    result[key] = newValue;
    return result;
}

function hasSetter(obj: any): obj is { set(key: string | number, value: any): any } {
    return typeof obj.set === 'function';
}

/**
 * Create a new Lens using a get and a set function. The get is used as an normal deriver function
 * including the automatic recording of dependencies, the set is used as a sink for new values.
 *
 * @param descriptor the get and set functions
 */
export function lens<V>(descriptor: LensDescriptor<V, never>): Atom<V>;
export function lens<V, P1>(descriptor: LensDescriptor<V, P1>, p1: P1 | Derivable<P1>): Atom<V>;
export function lens<V, P1, P2>(descriptor: LensDescriptor<V, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Atom<V>;
export function lens<V, P>(descriptor: LensDescriptor<V, P>, ...ps: Array<P | Derivable<P>>): Atom<V>;
export function lens<V, P>(descriptor: LensDescriptor<V, P>, ...ps: Array<P | Derivable<P>>): Atom<V> {
    return new Lens(descriptor, ps.length ? ps : undefined);
}

/**
 * A description of a standalone lens with arbitrary dependencies. Can be used with the {@link lens} function
 * to create a new Lens.
 */
export interface LensDescriptor<V, P> {
    get(...ps: P[]): V;
    set(newValue: V, ...ps: P[]): void;
}

/**
 * A description of a derived lens that automatically uses the {@link Atom#get} and {@link Atom#set} functions with
 * the provided deriver (get) and transform (set) functions. Can be used with the {@link Atom#lens} function to create
 * a new Lens.
 */
export interface MonoLensDescriptor<T, V, P> {
    get(targetValue: T, ...ps: P[]): V;
    set(newValue: V, targetValue: T, ...ps: P[]): T;
}

// Augments the Atom interface with the lens method.
declare module './atom' {
    // tslint:disable-next-line:no-shadowed-variable
    export interface Atom<V> {
        /**
         * Create a new Lens using the provided deriver (get) and transform (set) functions.
         *
         * @param descriptor the deriver (get) and transform (set) functions
         */
        lens<W>(descriptor: MonoLensDescriptor<V, W, never>): Atom<W>;
        lens<W, P1>(descriptor: MonoLensDescriptor<V, W, P1>, p1: P1 | Derivable<P1>): Atom<W>;
        lens<W, P1, P2>(descriptor: MonoLensDescriptor<V, W, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Atom<W>;
        lens<W, P>(descriptor: MonoLensDescriptor<V, W, P>, ...ps: Array<P | Derivable<P>>): Atom<W>;

        /**
         * Create a derivation that plucks the property with the given key of the current value of the Derivable.
         *
         * @param key the key or derivable to a key that should be used to dereference the current value
         */
        pluck<K extends keyof V>(key: K | Derivable<K>): Atom<V[K]>;
        pluck(key: string | number | Derivable<string | number>): Atom<any>;
    }
}
Atom.prototype.lens = Lens.prototype.lens;
Atom.prototype.pluck = Lens.prototype.pluck;
