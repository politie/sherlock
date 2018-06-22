import { SettableDerivable, State } from '../interfaces';
import { emptyCache, getState, observers } from '../symbols';
import { isRecordingObservations, recordObservation } from '../tracking';
import { processChangedAtom } from '../transaction';
import { config, equals, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { maybeDisconnectInNextTick } from './derivation';

export abstract class DataSource<V> extends BaseDerivable<V> implements SettableDerivable<V> {
    /**
     * Optional hook that will be called when the first observer connects to this datasource.
     */
    protected onConnect?(): void;

    /**
     * Optional hook that will be called when the last observer disconnects from this datasource.
     */
    protected onDisconnect?(): void;

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
     * Indicates whether the datasource is actively used to power a reactor, either directly or indirectly with other derivations in
     * between, or connected in this tick because of autoCacheMode. Should always be kept up to date in order to prevent memory leaks.
     */
    protected connected = false;

    /**
     * The last value that was calculated for this datasource. Is only used when connected.
     */
    private _cachedState: State<V> | typeof emptyCache = emptyCache;

    /**
     * Indicates whether the datasource is in autoCache mode.
     */
    private _autoCacheMode = false;

    /**
     * Used for debugging. A stack that shows the location where this datasource was created.
     */
    private readonly _stack = config.debugMode ? Error().stack : undefined;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    version = 0;

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [getState]() {
        // Should we connect now?
        if (!this.connected) {
            if (this._autoCacheMode) {
                // We will connect because of autoCacheMode, after a tick we may need to disconnect (if no reactor was started
                // in this tick).
                this.connect();
                maybeDisconnectInNextTick(this);
            } else if (isRecordingObservations()) {
                // We know we need to connect if isRecordingObservations() returns true (in which case our observer is connecting
                // and therefore recording its dependencies).
                this.connect();
            }
        }

        // Not connected, so just calculate our value one time.
        if (!this.connected) {
            return this.callCalculationFn();
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
            throw new Error('DataSource is not settable');
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

        const newValue = this.callCalculationFn();
        if (!equals(newValue, this._cachedState)) {
            this._cachedState = newValue;
            processChangedAtom(this, undefined, this.version++);
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    private callCalculationFn() {
        try {
            return this.calculateCurrentValue();
        } catch (e) {
            // tslint:disable-next-line:no-console - console.error is only called when debugMode is set to true
            this._stack && console.error(e.message, this._stack);
            return new ErrorWrapper(e);
        }
    }

    /**
     * Connect this datasource. It will make sure that the internal cache is kept up-to-date and all reactors are notified of changes
     * until disconnected.
     */
    connect() {
        if (this.connected) { return; }

        this.connected = true;
        this.onConnect && this.onConnect();
        this.checkForChanges();
    }

    /**
     * Disconnect this datasource when not in autoCache mode. It will disconnect all remaining observers (downstream) and stop all
     * reactors that depend on this datasource.
     *
     * When in autoCache mode, it will wait a tick and then disconnect only when no observers are listening.
     */
    disconnect() {
        if (this._autoCacheMode) {
            maybeDisconnectInNextTick(this);
        } else {
            this.disconnectNow();
        }
    }

    /**
     * Force disconnect.
     */
    disconnectNow() {
        // Disconnecting any remaining observers will in turn call this method again.
        if (!this.connected) { return; }

        this.connected = false;
        this._cachedState = emptyCache;
        this.onDisconnect && this.onDisconnect();
        // Disconnect all observers. When an observer disconnects it removes itself from this array.
        const obs = this[observers];
        for (let i = obs.length - 1; i >= 0; i--) {
            obs[i].disconnect();
        }
    }

    /**
     * Sets this Derivable to autoCache mode. This will cache the value of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The value is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache() {
        this._autoCacheMode = true;
        return this;
    }

    /**
     * Returns whether the datasource is settable in which case it should behave as an Atom.
     */
    get settable() {
        return !!this.acceptNewValue;
    }
}
