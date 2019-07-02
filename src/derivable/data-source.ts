import { MaybeFinalState, SettableDerivable, State } from '../interfaces';
import { connect, disconnect, emptyCache, internalGetState, rollback } from '../symbols';
import { independentTracking, recordObservation } from '../tracking';
import { markObservers, processChangedState, registerForRollback } from '../transaction';
import { augmentStack, equals, ErrorWrapper, FinalWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';

export abstract class PullDataSource<V> extends BaseDerivable<V> implements SettableDerivable<V> {
    /**
     * Required function that calculates the current value for this datasource. Will be called once everytime
     * `get()` is called when not connected. When connected, it will be called once and then only whenever `checkForChanges()`
     * was called.
     */
    protected abstract calculateCurrentValue(): MaybeFinalState<V>;

    /**
     * When implemented this datasource will become settable and any value that is presented to `set()` will
     * be given to this method. Call `this.checkForChanges()` when the current value of the datasource might
     * be changed in order to notify any observer.
     */
    protected acceptNewValue?(newValue: V): void;

    /**
     * The last value that was calculated for this datasource. Is only used when connected.
     * @internal
     */
    protected _cachedState: MaybeFinalState<V> | typeof emptyCache = emptyCache;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    version = 0;

    private _isFinal(): this is { _cachedState: FinalWrapper<State<V>> } {
        return this._cachedState instanceof FinalWrapper;
    }

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [internalGetState]() {
        if (this.connected) {
            // We are connected, so we should record our dependencies.
            recordObservation(this, this._isFinal());
            return this._cachedState as MaybeFinalState<V>;
        }

        if (this._isFinal()) {
            return this._cachedState;
        }

        // Not connected, so just calculate our value one time.
        return this._callCalculationFn();
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

        const newValue = independentTracking(() => this._callCalculationFn());
        const oldValue = this._cachedState;
        if (!equals(newValue, oldValue)) {
            this._cachedState = newValue;
            registerForRollback(this, oldValue, this.version++);
            processChangedState(this);
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     * @internal
     */
    private _callCalculationFn() {
        try {
            return this.calculateCurrentValue();
        } catch (e) {
            return new ErrorWrapper(augmentStack(e, this));
        }
    }

    /**
     * Datasources do not participate in transactions, so any derivation that depend on them may not assume anything about their state after a rollback.
     */
    [rollback](_oldValue: V, _oldVersion: number) {
        this.version++;
        markObservers(this, []);
    }

    /**
     * Connect this datasource. It will make sure that the internal cache is kept up-to-date and all reactors are notified of changes
     * until disconnected.
     */
    [connect]() {
        super[connect]();
        this.connected && this.checkForChanges();
    }

    [disconnect]() {
        super[disconnect]();
        this.finalized || (this._cachedState = emptyCache);
    }

    /**
     * Returns whether the datasource is settable in which case it should behave as an Atom.
     */
    get settable() {
        return !!this.acceptNewValue;
    }
}
