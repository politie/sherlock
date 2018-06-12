import { Derivable } from '../derivable.interface';

/**
 * The Derivable implements the `swap()` method.
 */
export interface Swappable<V> {
    /**
     * Swaps the current value of this atom using the provided swap function. Any additional arguments to this function are
     * fed to the swap function.
     *
     * @param f the swap function
     */
    swap: SwapMethod<V>;
}

export interface SwapMethod<V> {
    /**
     * Swaps the current value of this atom using the provided swap function. Any additional arguments to this function are
     * fed to the swap function.
     *
     * @param f the swap function
     */
    (f: (v: V) => V): void;
    <P1>(f: (v: V, p1: P1) => V, p1: P1 | Derivable<P1>): void;
    <P1, P2>(f: (v: V, p1: P1, p2: P2) => V, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): void;
    <P>(f: (v: V, ...ps: P[]) => V, ...ps: Array<P | Derivable<P>>): void;
    (f: (oldValue: V, ...args: any[]) => V, ...args: any[]): void;
}
