import { Derivable, SettableDerivable } from './derivable.interface';

export interface Lensable<V> {
    /**
     * Create a new Lens using the provided deriver (get) and transform (set) functions.
     *
     * @param descriptor the deriver (get) and transform (set) functions
     */
    lens: LensFn<V>;
}
export interface LensFn<V> {
    /**
     * Create a new Lens using the provided deriver (get) and transform (set) functions.
     *
     * @param descriptor the deriver (get) and transform (set) functions
     */
    <W>(descriptor: MonoLensDescriptor<V, W, never>): SettableDerivable<W>;
    <W, P1>(descriptor: MonoLensDescriptor<V, W, P1>, p1: P1 | Derivable<P1>): SettableDerivable<W>;
    <W, P1, P2>(descriptor: MonoLensDescriptor<V, W, P1 | P2>, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): SettableDerivable<W>;
    <W, P>(descriptor: MonoLensDescriptor<V, W, P>, ...ps: Array<P | Derivable<P>>): SettableDerivable<W>;
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
