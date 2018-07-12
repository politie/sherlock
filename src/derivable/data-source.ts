import { SettableDerivable, State } from '../interfaces';
import { connect, disconnect, emptyCache, internalGetState, observers } from '../symbols';
import { recordObservation } from '../tracking';
import { processChangedAtom } from '../transaction';
import { augmentStack, equals, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';

export abstract class PullDataSource<V> extends BaseDerivable<V> implements SettableDerivable<V> {
    /**
     * Required function that calculates the current value for this datasource. Will be called once everytime
     * `get()` is called when not connected. When connected, it will be called once and then only whenever `checkForChanges()`
     * was called.
     */
    protected abstract calculateCurrentValue(): State<V>;

    /**
     * When implemented this datasource will become settable and any value that is presented to `set()` will
     * be given to this method. Call `this.checkForChanges()` when the current value of the datasource might
     * be changed in order to notify any observer.
     */
    protected acceptNewValue?(newValue: V): void;

    /**
     * The last value that was calculated for this datasource. Is only used when connected.
     */
    private _cachedState: State<V> | typeof emptyCache = emptyCache;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    version = 0;

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [internalGetState]() {
        // Not connected, so just calculate our value one time.
        if (!this.connected) {
            return this._callCalculationFn();
        }

        // We are connected, so we should record our dependencies.
        recordObservation(this);
        return this._cachedState as State<V>;
    }

    /**
     * Sets the value of this datasource, throws when not settable, fires reactors when expected.
     *
     * @param newValue the new state
     */
    set(newValue: V) {
        if (!this.acceptNewValue) {
            throw augmentStack(new Error('DataSource is not settable'), this);
        }
        this.acceptNewValue(newValue);
    }

    /**
     * Update the currently cached value of this datasource (only when connected) and notify observers when neccessary.
     */
    protected checkForChanges() {
        if (!this.connected) {
            return;
        }

        const newValue = this._callCalculationFn();
        if (!equals(newValue, this._cachedState)) {
            const oldState = this._cachedState;
            this._cachedState = newValue;
            processChangedAtom(this, oldState, this.version++);
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    private _callCalculationFn() {
        try {
            return this.calculateCurrentValue();
        } catch (e) {
            return new ErrorWrapper(augmentStack(e, this));
        }
    }

    /**
     * Connect this datasource. It will make sure that the internal cache is kept up-to-date and all reactors are notified of changes
     * until disconnected.
     */
    [connect]() {
        super[connect]();
        this.checkForChanges();
    }

    [disconnect]() {
        super[disconnect]();
        this._cachedState = emptyCache;
        // Disconnect all observers. When an observer disconnects it removes itself from this array.
        const obs = this[observers];
        for (let i = obs.length - 1; i >= 0; i--) {
            obs[i][disconnect]();
        }
    }

    /**
     * Returns whether the datasource is settable in which case it should behave as an Atom.
     */
    get settable() {
        return !!this.acceptNewValue;
    }
}
