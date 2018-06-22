import { Derivable, DerivableAtom, SettableDerivable, StandaloneLensDescriptor, State } from '../interfaces';
import { unresolved as unresolvedSymbol } from '../symbols';
import { ErrorWrapper } from '../utils';
import { Atom } from './atom';
import { Constant } from './constant';
import { Derivation } from './derivation';
import { Lens } from './lens';

// tslint:disable:no-namespace

/**
 * Construct a new atom with the provided initial value.
 *
 * @param value the initial value
 */
export function atom<V>(value: V): SettableDerivable<V> & DerivableAtom {
    return new Atom(value);
}
export namespace atom {
    export function unresolved<V>(): SettableDerivable<V> & DerivableAtom {
        return new Atom<V>(unresolvedSymbol);
    }
    export function error<V>(err: any): SettableDerivable<V> & DerivableAtom {
        return new Atom<V>(new ErrorWrapper(err));
    }
}

/**
 * Create a new derivation using the deriver function.
 *
 * @param deriver the deriver function
 */
export function derive<R>(f: () => State<R>): Derivable<R>;
export function derive<R, P1>(f: (p1: P1) => State<R>, p1: P1 | Derivable<P1>): Derivable<R>;
export function derive<R, P1, P2>(f: (p1: P1, p2: P2) => State<R>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
export function derive<R, P>(f: (...ps: P[]) => State<R>, ...ps: Array<P | Derivable<P>>): Derivable<R>;
export function derive<R, P>(f: (...ps: P[]) => State<R>, ...ps: Array<P | Derivable<P>>): Derivable<R> {
    return new Derivation(f, ps.length ? ps : undefined);
}

/**
 * Creates a new Constant with the give value.
 *
 * @param value the immutable value of this Constant
 */
export function constant<V>(value: V): Derivable<V> {
    return new Constant(value);
}
export namespace constant {
    export function unresolved<V>(): Derivable<V> {
        return new Constant<V>(unresolvedSymbol);
    }
    export function error<V>(err: any): Derivable<V> {
        return new Constant<V>(new ErrorWrapper(err));
    }
}

/**
 * Create a new Lens using a get and a set function. The get is used as an normal deriver function
 * including the automatic recording of dependencies, the set is used as a sink for new values.
 *
 * @param descriptor the get and set functions
 */
export function lens<V>(descriptor: StandaloneLensDescriptor<V, never>): SettableDerivable<V>;
export function lens<V, P1>(descriptor: StandaloneLensDescriptor<V, P1>, p1: P1 | Derivable<P1>): SettableDerivable<V>;
export function lens<V, P1, P2>(
    descriptor: StandaloneLensDescriptor<V, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): SettableDerivable<V>;
export function lens<V, P>(descriptor: StandaloneLensDescriptor<V, P>, ...ps: Array<P | Derivable<P>>): SettableDerivable<V>;
export function lens<V, P>(descriptor: StandaloneLensDescriptor<V, P>, ...ps: Array<P | Derivable<P>>): SettableDerivable<V> {
    return new Lens(descriptor, ps.length ? ps : undefined);
}
