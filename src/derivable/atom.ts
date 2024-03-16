import { DerivableAtom, MaybeFinalState, State } from '../interfaces';
import { finalize, internalGetState, rollback } from '../symbols';
import { markFinal, recordObservation } from '../tracking';
import { markObservers, processChangedState, registerForRollback } from '../transaction';
import { augmentStack, augmentState, equals, FinalWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';

/**
 * Atom is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export class Atom<V> extends BaseDerivable<V> implements DerivableAtom<V> {
    /**
     * Contains the current state of this atom. Note that this field is public for transaction support, should
     * not be used in application code. Use {@link Derivable#get} and {@link SettableDerivable#set} instead.
     */
    _value: MaybeFinalState<V>;

    /**
     * Construct a new atom with the provided initial state.
     *
     * @param state the initial state
     */
    constructor(state: MaybeFinalState<V>) {
        super();
        this._value = augmentState(state, this);
        if (this._isFinal()) {
            this[finalize]();
        }
    }

    /**
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    version = 0;

    get settable() {
        return !this._isFinal();
    }

    private _isFinal(): this is { _value: FinalWrapper<State<V>> } {
        return this._value instanceof FinalWrapper;
    }

    /**
     * Returns the current state of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [internalGetState]() {
        recordObservation(this, this._isFinal());
        return this._value;
    }

    /**
     * Sets the state of this atom, fires reactors when expected.
     *
     * @param newState the new state
     */
    set(newState: MaybeFinalState<V>) {
        const oldState = this._value;
        if (!equals(newState, oldState)) {
            if (this._isFinal()) {
                throw augmentStack(new Error('cannot set a final derivable'), this);
            }

            this._value = augmentState(newState, this);
            registerForRollback(this, oldState, this.version++);
            processChangedState(this);
            if (this._isFinal()) {
                markFinal(this);
            }
        }
    }

    [rollback](oldValue: V, oldVersion: number) {
        this._value = oldValue;
        this.version = oldVersion;
        markObservers(this, []);
    }
}
