import { Derivable, SettableDerivable } from '../derivable.interface';

export function valueGetter<V>(this: Derivable<V>) { return this.get(); }
export function valueSetter<V>(this: SettableDerivable<V>, newValue: V) { return this.set(newValue); }
