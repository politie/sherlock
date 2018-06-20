import { SettableDerivable, Unsettable } from '../interfaces';
import { recordObservation } from '../tracking';
import { processChangedAtom } from '../transaction';
import { equals } from '../utils';
import { BaseDerivable } from './base-derivable';
import { getValueOrUnresolved, unresolved } from './symbols';

/**
 * Atom is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export class Atom<V> extends BaseDerivable<V> implements SettableDerivable<V>, Unsettable {
    /**
     * Construct a new atom with the provided initial value.
     *
     * @param value the initial value
     */
    constructor(
        /**
         * Contains the current value of this atom. Note that this field is public for transaction support, should
         * not be used in application code. Use {@link Derivable#get} and {@link SettableDerivable#set} instead.
         */
        public _value: V | typeof unresolved,
    ) {
        super();
    }

    /**
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    version = 0;

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [getValueOrUnresolved]() {
        recordObservation(this);
        return this._value;
    }

    /**
     * Sets the value of this atom, fires reactors when expected.
     *
     * @param newValue the new state
     */
    set(newValue: V | typeof unresolved) {
        const oldValue = this._value;
        if (!equals(newValue, oldValue)) {
            this._value = newValue;
            processChangedAtom(this, oldValue, this.version++);
        }
    }

    unset() {
        this.set(unresolved);
    }

    readonly settable!: true;
}
Object.defineProperty(Atom.prototype, 'settable', { value: true });
