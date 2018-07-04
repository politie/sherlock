import { Derivable, State } from '../interfaces';
import { dependencies, dependencyVersions, disconnect, emptyCache, getState, mark, observers, unresolved } from '../symbols';
import { recordObservation, removeObserver, startRecordingObservations, stopRecordingObservations, TrackedObservable, TrackedReactor } from '../tracking';
import { config, equals, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { unwrap } from './unwrap';

export abstract class BaseDerivation<V> extends BaseDerivable<V> implements Derivable<V> {
    /**
     * Indicates whether the current cachedValue of this derivation is known to be up to date, or might need an update. Is set to false
     * by our dependencies when needed. We should be able to trust `true`. It may only be set to true when connected, because true means
     * that we depend on upstream dependencies to keep us informed of changes.
     */
    private _isUpToDate = false;

    /**
     * The last value that was calculated for this derivation. Is only used when connected.
     */
    private _cachedState: State<V> | typeof emptyCache = emptyCache;

    /**
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    protected readonly _stack = config.debugMode ? Error().stack : undefined;

    private _version = 0;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    get version() {
        this._updateIfNeeded();
        return this._version;
    }

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [getState]() {
        // Not connected, so just calculate our value one time.
        if (!this.connected) {
            return this._callDeriver();
        }

        this._updateIfNeeded();
        recordObservation(this);
        return this._cachedState as State<V>;
    }

    /**
     * Determine if this derivation needs an update (when connected). Compares the recorded dependencyVersions with the
     * current actual versions of the dependencies. If there is any mismatch between versions we need to update. Simple.
     */
    private _updateIfNeeded() {
        if (!this.connected || this._isUpToDate) {
            return;
        }
        // Update the isUpToDate boolean only when it is false and we know all our dependencies (c.q. the cache is not empty).
        if (this._cachedState !== emptyCache) {
            this._isUpToDate = this._compareVersions();
        }
        if (!this._isUpToDate) {
            this._update();
        }
    }

    /**
     * Update the currently cached value of this derivation (only when connected).
     */
    protected _update() {
        const newValue = this._callDeriver();
        this._isUpToDate = true;
        if (!equals(newValue, this._cachedState)) {
            this._cachedState = newValue;
            this._version++;
        }
    }

    protected abstract _compareVersions(): boolean;
    protected abstract _callDeriver(): State<V>;

    /**
     * Mark this derivation and all observers of this derivation as "possible outdated" or "state unknown". If this derivation is already
     * in that state, all observers of this derivation are also expected to already be in that state. This invariant should never
     * be invalidated. Any reactors we encounter are pushed into the reactorSink.
     */
    [mark](reactorSink: TrackedReactor[]) {
        // If we think we're up-to-date our observers might think the same, otherwise, we're good, cause our observers can never
        // believe the're up-to-date when any of their dependencies is not up-to-date.
        if (this._isUpToDate) {
            this._isUpToDate = false;
            for (const observer of this[observers]) {
                observer[mark](reactorSink);
            }
        }
    }

    /**
     * Force disconnect.
     */
    [disconnect]() {
        super[disconnect]();
        this._isUpToDate = false;
        this._cachedState = emptyCache;
        // istanbul ignore if: should never happen!
        if (this[observers].length) {
            throw new Error('Inconsistent state!');
        }
    }
}

export let derivationStackDepth = 0;

/**
 * Derivation is the implementation of derived state. Automatically tracks other Derivables that are used in the deriver function
 * and updates when needed.
 */
export class Derivation<V> extends BaseDerivation<V> implements Derivable<V> {

    /**
     * Create a new Derivation using the deriver function.
     *
     * @param _deriver the deriver function
     */
    constructor(
        /**
         * The deriver function that is used to calculate the value of this derivation.
         */
        private readonly _deriver: (...args: any[]) => State<V>,
        /**
         * Arguments that will be passed unwrapped to the deriver function.
         */
        protected readonly _args?: any[],
    ) {
        super();
    }

    /**
     * The recorded dependencies of this derivation. Is only used when the derivation is connected (i.e. it is actively used to
     * power a reactor, either directly or indirectly with other derivations in between).
     */
    readonly [dependencies]: TrackedObservable[] = [];

    /**
     * The versions of all dependencies that were used to calculate the currently known value. Is used to determine whether
     * the deriver function needs to be called.
     */
    readonly [dependencyVersions]: { [id: number]: number } = {};

    /**
     * Update the currently cached value of this derivation (only when connected).
     */
    protected _update() {
        startRecordingObservations(this);
        try {
            super._update();
        } finally {
            stopRecordingObservations();
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    protected _callDeriver() {
        ++derivationStackDepth;
        try {
            const { _deriver, _args } = this;
            return _args ? _deriver(..._args.map(unwrap)) : _deriver();
        } catch (e) {
            if (e === unresolved) {
                return unresolved;
            }
            // tslint:disable-next-line:no-console - console.error is only called when debugMode is set to true
            this._stack && console.error(e.message, this._stack);
            return new ErrorWrapper(e);
        } finally {
            --derivationStackDepth;
        }
    }

    protected _compareVersions() {
        return this[dependencies].every(obs => this[dependencyVersions][obs.id] === obs.version);
    }

    /**
     * Force disconnect.
     */
    [disconnect]() {
        super[disconnect]();
        for (const dep of this[dependencies]) {
            removeObserver(dep, this);
        }
        this[dependencies].length = 0;
    }

}

export function deriveMethod<V extends P, R, P>(
    this: Derivable<V>,
    f: (v: V, ...ps: P[]) => R,
    ...ps: Array<P | Derivable<P>>
): Derivable<R> {
    return new Derivation(f, [this, ...ps]);
}
