import { DerivableAtom, SettableDerivable, State } from '../interfaces';
import { getState, restorableState, unresolved } from '../symbols';
import { recordObservation } from '../tracking';
import { processChangedAtom } from '../transaction';
import { equals, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';

/**
 * Atom is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export class Atom<V> extends BaseDerivable<V> implements SettableDerivable<V>, DerivableAtom {
    /**
     * Contains the current state of this atom. Note that this field is public for transaction support, should
     * not be used in application code. Use {@link Derivable#get} and {@link SettableDerivable#set} instead.
     */
    [restorableState]: State<V>;

    /**
     * Construct a new atom with the provided initial state.
     *
     * @param state the initial state
     */
    constructor(state: State<V>) {
        super();
        this[restorableState] = state;
    }

    /**
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    version = 0;

    /**
     * Returns the current state of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [getState]() {
        recordObservation(this);
        return this[restorableState];
    }

    /**
     * Sets the state of this atom, fires reactors when expected.
     *
     * @param newState the new state
     */
    set(newState: State<V>) {
        const oldState = this[restorableState];
        if (!equals(newState, oldState)) {
            this[restorableState] = newState;
            processChangedAtom(this, oldState, this.version++);
        }
    }

    unset() {
        this.set(unresolved);
    }

    setError(err: any) {
        this.set(new ErrorWrapper(err));
    }

    readonly settable!: true;
}
Object.defineProperty(Atom.prototype, 'settable', { value: true });
