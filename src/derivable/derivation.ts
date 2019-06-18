import { Derivable, MaybeFinalState, State } from '../interfaces';
import { connect, dependencies, dependencyVersions, disconnect, emptyCache, internalGetState, mark, observers, unresolved } from '../symbols';
import {
    foundNoDependencies, recordObservation, removeObserver, startRecordingObservations, stopRecordingObservations, TrackedObservable, TrackedReactor,
} from '../tracking';
import { augmentStack, equals, ErrorWrapper, FinalWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { unwrap } from './unwrap';

export abstract class BaseDerivation<V> extends BaseDerivable<V> implements Derivable<V> {
    /**
     * Indicates whether the current cachedValue of this derivation is known to be up to date, or might need an update. Is set to false
     * by our dependencies when needed. We should be able to trust `true`. It may only be set to true when connected, because true means
     * that we depend on upstream dependencies to keep us informed of changes.
     * @internal
     */
    private _isUpToDate = false;

    /**
     * The last value that was calculated for this derivation. Is only used when connected.
     * @internal
     */
    private _cachedState: MaybeFinalState<V> | typeof emptyCache = emptyCache;

    /** @internal */
    private _version = 0;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    get version() {
        this._updateIfNeeded();
        return this._version;
    }

    protected get _final() {
        return this._cachedState instanceof FinalWrapper;
    }

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [internalGetState]() {
        if (this._final) {
            return this._cachedState as FinalWrapper<State<V>>;
        }

        // Not connected, so just calculate our value one time.
        if (!this.connected) {
            return this._callDeriver();
        }

        this._updateIfNeeded();
        recordObservation(this, this._final);
        return this._cachedState as State<V>;
    }

    /**
     * Determine if this derivation needs an update (when connected). Compares the recorded dependencyVersions with the
     * current actual versions of the dependencies. If there is any mismatch between versions we need to update. Simple.
     * @internal
     */
    private _updateIfNeeded() {
        if (!this.connected || this._isUpToDate || this._final) {
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
     * @internal
     */
    protected _update() {
        const newValue = this._callDeriver();
        this._isUpToDate = true;
        if (!equals(newValue, this._cachedState)) {
            this._cachedState = newValue;
            this._version++;
        }
    }

    /** @internal */
    protected abstract _compareVersions(): boolean;
    /** @internal */
    protected abstract _callDeriver(): MaybeFinalState<V>;

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

    [connect]() {
        this._final || super[connect]();
    }

    /**
     * Force disconnect.
     */
    [disconnect]() {
        super[disconnect]();
        this._isUpToDate = false;
        this._final || (this._cachedState = emptyCache);
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
         * @internal
         */
        private readonly _deriver: (this: Derivable<V>, ...args: any[]) => MaybeFinalState<V>,
        /**
         * Arguments that will be passed unwrapped to the deriver function.
         * @internal
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
     * @internal
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
     * Call the deriver function and log debug stack traces when applicable.
     * @internal
     */
    protected _callDeriver() {
        ++derivationStackDepth;
        try {
            const value = this._args ? this._deriver(...this._args.map(unwrap)) : this._deriver();
            return foundNoDependencies() ? FinalWrapper.wrap(value) : value;
        } catch (e) {
            if (e === unresolved) {
                return unresolved;
            }
            return new ErrorWrapper(augmentStack(e, this));
        } finally {
            --derivationStackDepth;
        }
    }

    /** @internal */
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
