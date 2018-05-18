import { atomic } from '../transaction';
import { MixinFn, MixinProp } from '../utils';
import { Atom } from './atom';
import { Derivable } from './derivable';
import { Derivation } from './derivation';
import { AtomPluck, pluck } from './pluck';
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
    _value: never;

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
     * Create a new Lens using the provided deriver (get) and transform (set) functions.
     *
     * @param param0 the deriver (get) and transform (set) functions
     */
    lens<W>(descriptor: MonoLensDescriptor<V, W, never>): Atom<W>;
    lens<W, P1>(descriptor: MonoLensDescriptor<V, W, P1>, p1: P1 | Derivable<P1>): Atom<W>;
    lens<W, P1, P2>(descriptor: MonoLensDescriptor<V, W, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Atom<W>;
    lens<W, P>(descriptor: MonoLensDescriptor<V, W, P>, ...ps: Array<P | Derivable<P>>): Atom<W>;
    lens<W, P>({ get, set }: MonoLensDescriptor<V, W, P>, ...ps: Array<P | Derivable<P>>): Atom<W> {
        const atom = this;
        return new Lens({
            get,
            set() { atom.set(set.apply(undefined, arguments)); },
        }, [atom, ...ps]);
    }

    @MixinFn(pluck) pluck!: AtomPluck<V>;
    @MixinProp(Atom.prototype) swap!: Atom<V>['swap'];
    @MixinProp(Atom.prototype) value!: V;
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
    }
}
Atom.prototype.lens = Lens.prototype.lens;
