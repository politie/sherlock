import { Constant, DataSource, Derivation, Lens } from '../derivable';
import { SettableDerivable, Derivable } from '../derivable/interfaces';

// tslint:disable:unified-signatures

/**
 * Returns true iff the provided `derivable` satisfies the Atom interface (i.e. an Atom or a Lens).
 *
 * @param derivable the object to test
 */
export function isAtom<V>(derivable: Derivable<V>): derivable is SettableDerivable<V>;
export function isAtom<V>(obj: any): obj is SettableDerivable<V>;
export function isAtom(derivable: any) {
    return derivable instanceof Atom
        || derivable instanceof Lens
        || derivable instanceof DataSource && derivable.settable;
}

/**
 * Returns true iff the provided `derivable` is a Constant.
 *
 * @param derivable the object to test
 */
export function isConstant<V>(derivable: Derivable<V>): derivable is Constant<V>;
export function isConstant<V>(obj: any): obj is Constant<V>;
export function isConstant(derivable: any) {
    return derivable instanceof Constant;
}

/**
 * Returns true iff the provided `derivable` is a Derivable.
 *
 * @param derivable the object to test
 */
export function isDerivable<V>(derivable: Derivable<V>): derivable is Derivable<V>;
export function isDerivable(obj: any): obj is Derivable<any>;
export function isDerivable(derivable: any) {
    return derivable instanceof Derivable;
}

/**
 * Returns true iff the provided `derivable` is a Derivation.
 *
 * @param derivable the object to test
 */
export function isDerivation<V>(derivable: Derivable<V>): derivable is Derivation<V>;
export function isDerivation<V>(obj: any): obj is Derivation<V>;
export function isDerivation(derivable: any) {
    return derivable instanceof Derivation;
}

/**
 * Returns true iff the provided `derivable` is a Lens.
 *
 * @param derivable the object to test
 */
export function isLens<V>(derivable: Derivable<V>): derivable is Lens<V>;
export function isLens<V>(obj: any): obj is Lens<V>;
export function isLens(derivable: any) {
    return derivable instanceof Lens;
}
