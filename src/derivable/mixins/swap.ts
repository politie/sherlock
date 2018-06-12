import { SettableDerivable } from '../derivable.interface';

export function swapMethod<V>(this: SettableDerivable<V>, f: (oldValue: V, ...args: any[]) => V, ...args: any[]) {
    this.set(f(this.get(), ...args));
}
