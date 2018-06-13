import { Atom } from './atom';
import { Constant } from './constant';
import { Derivable, SettableDerivable } from './derivable.interface';
import { Derivation } from './derivation';
import { Lens } from './lens';
import { LensDescriptor } from './mixins/lens.interface';

/**
 * Construct a new atom with the provided initial value.
 *
 * @param value the initial value
 */
export function atom<V>(value: V): SettableDerivable<V> {
    return new Atom(value);
}

/**
 * Create a new derivation using the deriver function.
 *
 * @param deriver the deriver function
 */
export function derive<R>(f: () => R): Derivable<R>;
export function derive<R, P1>(f: (p1: P1) => R, p1: P1 | Derivable<P1>): Derivable<R>;
export function derive<R, P1, P2>(f: (p1: P1, p2: P2) => R, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
export function derive<R, P>(f: (...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R>;
export function derive<R, P>(f: (...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R> {
    return new Derivation(f, ps.length ? ps : undefined);
}

/**
 * @deprecated use `derive` instead, will be removed in 2.0 final
 */
export const derivation = derive;

/**
 * Creates a new Constant with the give value.
 *
 * @param value the immutable value of this Constant
 */
export function constant<V>(value: V): Derivable<V> {
    return new Constant(value);
}

/**
 * Create a new Lens using a get and a set function. The get is used as an normal deriver function
 * including the automatic recording of dependencies, the set is used as a sink for new values.
 *
 * @param descriptor the get and set functions
 */
export function lens<V>(descriptor: LensDescriptor<V, never>): SettableDerivable<V>;
export function lens<V, P1>(descriptor: LensDescriptor<V, P1>, p1: P1 | Derivable<P1>): SettableDerivable<V>;
export function lens<V, P1, P2>(
    descriptor: LensDescriptor<V, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): SettableDerivable<V>;
export function lens<V, P>(descriptor: LensDescriptor<V, P>, ...ps: Array<P | Derivable<P>>): SettableDerivable<V>;
export function lens<V, P>(descriptor: LensDescriptor<V, P>, ...ps: Array<P | Derivable<P>>): SettableDerivable<V> {
    return new Lens(descriptor, ps.length ? ps : undefined);
}
