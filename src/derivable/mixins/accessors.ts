import { Derivable, SettableDerivable } from '../derivable.interface';

/**
 * The basic value getter
 */
function get<V>(this: Derivable<V>) { return this.get(); }
/**
 * The basic value setter
 */
function set<V>(this: SettableDerivable<V>, newValue: V) { return this.set(newValue); }

/**
 * Add only the `value` getter to the prototype
 *
 * @param prot The prototype of a Derivable class
 */
export function addValueGetter<V>(prot: Derivable<V>) {
    Object.defineProperty(prot, 'value', { get });
}
/**
 * Add the `value` getter and setter to the prototype
 *
 * @param prot The prototype of a SettableDerivable class
 */
export function addValueAccessors<V>(prot: SettableDerivable<V>) {
    Object.defineProperty(prot, 'value', { get, set });
}
