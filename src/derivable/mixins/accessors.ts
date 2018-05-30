import { Derivable, SettableDerivable } from '../derivable';

function get<V>(this: Derivable<V>) { return this.get(); }
function set<V>(this: SettableDerivable<V>, newValue: V) { return this.set(newValue); }

export function addValueGetter<V>(prot: Derivable<V>) {
    Object.defineProperty(prot, 'value', { get });
}
export function addValueAccessors<V>(prot: SettableDerivable<V>) {
    Object.defineProperty(prot, 'value', { get, set });
}
