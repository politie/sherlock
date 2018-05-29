import { SettableDerivable } from '../derivable';

export function swap<V>(this: SettableDerivable<V>, f: (oldValue: V, ...args: any[]) => V, ...args: any[]) {
    this.set(f(this.get(), ...args));
}
