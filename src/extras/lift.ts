import { Derivable, Derivation } from '../derivable';

/**
 * Lifts the function f into a function over Derivables returning a Derivable, for example:
 *
 *     const minLength = lift((s: string) => s.length > 3);
 *     const s$ = atom('abcd');
 *     const hasMinLength$ = minLength(s$);
 *     console.log(hasMinLength$.get()) // true
 *
 * @param f the function to lift into a function over Derivables
 */
export function lift<R>(f: () => R): () => Derivable<R>;
export function lift<P1, R>(f: (p1: P1) => R): (p1: MD<P1>) => Derivable<R>;
export function lift<P1, P2, R>(f: (p1: P1, p2: P2) => R): (p1: MD<P1>, p2: MD<P2>) => Derivable<R>;
export function lift<P1, P2, P3, R>(f: (p1: P1, p2: P2, p3: P3) => R): (p1: MD<P1>, p2: MD<P2>, p3: MD<P3>) => Derivable<R>;

export function lift<P, R>(f: (...ps: P[]) => R): (...ps: Array<P | Derivable<P>>) => Derivable<R> {
    return (...ps: Array<P | Derivable<P>>) => new Derivation(f, ps);
}

export type MD<P> = P | Derivable<P>;
