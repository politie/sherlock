import { SettableDerivable } from '../derivable.interface';

/**
 * The `swap` method, to add to a SettableDerivable Prototype.
 *
 * Swaps the current value of this atom using the provided swap function. Any additional arguments to this function are
 * fed to the swap function.
 */
export function swap<V>(this: SettableDerivable<V>, f: (oldValue: V, ...args: any[]) => V, ...args: any[]) {
    this.set(f(this.get(), ...args));
}
