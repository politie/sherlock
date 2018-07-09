import { Derivable, DerivableAtom, SettableDerivable } from '../interfaces';
import { BaseDerivable } from './base-derivable';

/**
 * Returns true iff the provided `derivable` is a Derivable.
 *
 * @param derivable the object to test
 */
export function isDerivable<V>(derivable: Derivable<V>): derivable is Derivable<V>;
export function isDerivable(obj: any): obj is Derivable<any>;
export function isDerivable(derivable: any) {
    return derivable instanceof BaseDerivable;
}

/**
 * Returns true iff the provided `derivable` is a SettableDerivable.
 *
 * @param derivable the object to test
 */
export function isSettableDerivable<V>(derivable: Derivable<V>): derivable is SettableDerivable<V>;
export function isSettableDerivable(obj: any): obj is SettableDerivable<any>;
export function isSettableDerivable(derivable: any) {
    return isDerivable(derivable) && derivable.settable;
}

/**
 * Returns true iff the provided `derivable` is a DerivableAtom.
 *
 * @param obj the object to test
 */
export function isDerivableAtom<V>(derivable: Derivable<V>): derivable is DerivableAtom<V>;
export function isDerivableAtom(obj: any): obj is DerivableAtom<any> {
    return typeof (obj as DerivableAtom<any>).unset === 'function' && typeof (obj as DerivableAtom<any>).setError === 'function';
}
