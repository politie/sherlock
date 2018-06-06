import { recordObservation } from '../tracking';
import { processChangedAtom } from '../transaction';
import { equals } from '../utils/equals';
import { BaseDerivable, SettableDerivable } from './derivable';
import {
    addValueAccessors, and, AtomPluck, BooleanAnd, BooleanIs, BooleanNot, BooleanOr,
    Derive, deriveMethod, is, LensFn, lensMethod, not, or, pluck, Swap, swap,
} from './mixins';

/**
 * Atom is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export class Atom<V> extends BaseDerivable<V> implements SettableDerivable<V> {
    /**
     * An Atom is settable
     */
    readonly settable = true;

    /**
     * @internal
     * Construct a new atom with the provided initial value.
     *
     * @param value the initial value
     */
    constructor(
        /**
         * @internal
         * Contains the current value of this atom. Note that this field is public for transaction support, should
         * not be used in application code. Use {@link Derivable#get} and {@link Atom#set} instead.
         */
        public _value: V,
    ) {
        super();
    }

    /**
     * @internal
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    version = 0;

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    get() {
        recordObservation(this);
        return this._value;
    }

    /**
     * Sets the value of this atom, fires reactors when expected.
     *
     * @param newValue the new state
     */
    set(newValue: V) {
        const oldValue = this._value;
        if (!equals(newValue, oldValue)) {
            this._value = newValue;
            processChangedAtom(this, oldValue, this.version++);
        }
    }

    value!: V;
    swap!: Swap<V>;
    pluck!: AtomPluck<V>;
    lens!: LensFn<V>;
    derive!: Derive<V>;

    and!: BooleanAnd<V>;
    or!: BooleanOr<V>;
    not!: BooleanNot;
    is!: BooleanIs;
}
addValueAccessors(Atom.prototype);
Atom.prototype.swap = swap;
Atom.prototype.pluck = pluck as AtomPluck<any>;
Atom.prototype.lens = lensMethod;
Atom.prototype.derive = deriveMethod;
Atom.prototype.and = and;
Atom.prototype.or = or;
Atom.prototype.not = not;
Atom.prototype.is = is;
