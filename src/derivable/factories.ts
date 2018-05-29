import { Atom as AtomCtr } from './atom';
import { Atom } from './atom.interface';
import { Constant } from './constant';
import { Derivable } from './derivable';
import { Derivation } from './derivation';
import { Lens } from './lens';
import { LensDescriptor } from './lens.interface';

/**
 * Construct a new atom with the provided initial value.
 *
 * @param value the initial value
 */
export function atom<V>(value: V): Atom<V> {
    return new AtomCtr(value);
}

/**
 * Create a new derivation using the deriver function.
 *
 * @param deriver the deriver function
 */
export function derivation<R>(f: () => R): Derivable<R>;
export function derivation<R, P1>(f: (p1: P1) => R, p1: P1 | Derivable<P1>): Derivable<R>;
export function derivation<R, P1, P2>(f: (p1: P1, p2: P2) => R, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
export function derivation<R, P>(f: (...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R>;
export function derivation<R, P>(f: (...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R> {
    return new Derivation(f, ps.length ? ps : undefined);
}

/**
 * Creates a new Constant with the give value.
 *
 * @param value the immutable value of this Constant
 */
export function constant<V>(value: V): Constant<V> {
    return new Constant(value);
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
