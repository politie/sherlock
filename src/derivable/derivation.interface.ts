import { Derivable } from '../derivable';

export interface CanDerive<V> {
    /**
     * Create a derivation based on this Derivable and the given deriver function.
     *
     * @param f the deriver function
     */
    derive: Derive<V>;
}

export interface Derive<V> {
    /**
     * Create a derivation based on this Derivable and the given deriver function.
     *
     * @param f the deriver function
     */
    <R>(f: (v: V) => R): Derivable<R>;
    <R, P1>(f: (v: V, p1: P1) => R, p1: P1 | Derivable<P1>): Derivable<R>;
    <R, P1, P2>(f: (v: V, p1: P1, p2: P2) => R, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
    <R, P>(f: (v: V, ...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R>;
}
