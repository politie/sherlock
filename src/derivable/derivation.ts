import { Derivable, State } from '../interfaces';
import { dependencies, dependencyVersions, emptyCache, getState, mark, observers, unresolved } from '../symbols';
import {
    isRecordingObservations, recordObservation, removeObserver, startRecordingObservations, stopRecordingObservations, TrackedObservable, TrackedReactor
} from '../tracking';
import { config, equals, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { unwrap } from './unwrap';

export let derivationStackDepth = 0;

/**
 * Derivation is the implementation of derived state. Automatically tracks other Derivables that are used in the deriver function
 * and updates when needed.
 */
export class Derivation<V> extends BaseDerivable<V> implements Derivable<V> {
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
     * Indicates whether the derivation is actively used to power a reactor, either directly or indirectly with other derivations in
     * between, or connected in this tick because of autoCacheMode. Should always be kept up to date in order to prevent memory leaks.
     */
    private connected = false;

    /**
     * Indicates whether the current cachedValue of this derivation is known to be up to date, or might need an update. Is set to false
     * by our dependencies when needed. We should be able to trust `true`. It may only be set to true when connected, because true means
     * that we depend on upstream dependencies to keep us informed of changes.
     */
    private isUpToDate = false;

    /**
     * The last value that was calculated for this derivation. Is only used when connected.
     */
    private cachedState: State<V> | typeof emptyCache = emptyCache;

    /**
     * Indicates whether the derivation is in autoCache mode.
     */
    private autoCacheMode = false;

    /**
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    private readonly stack = config.debugMode ? Error().stack : undefined;

    /**
     * Create a new Derivation using the deriver function.
     *
     * @param deriver the deriver function
     */
    constructor(
        /**
         * The deriver function that is used to calculate the value of this derivation.
         */
        private readonly deriver: (...args: any[]) => State<V>,
        /**
         * Arguments that will be passed unwrapped to the deriver function.
         */
        protected readonly args?: any[],
    ) {
        super();
    }

    private _version = 0;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    get version() {
        this.updateIfNeeded();
        return this._version;
    }

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    [getState]() {
        // Should we connect now?
        if (!this.connected) {
            if (this.autoCacheMode) {
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
            return this.callDeriver();
        }

        this.updateIfNeeded();
        // We are connected, so we should record this instance as a dependency of our observers, but only if we have dependencies.
        // If we don't have any dependencies we are effectively immutable (because derivations must be pure functions), therefore we
        // don't record this observation to our observer.
        if (this[dependencies].length) {
            recordObservation(this);
        }
        return this.cachedState as State<V>;
    }

    /**
     * Update the currently cached value of this derivation (only when connected).
     */
    private updateIfNeeded() {
        if (!this.connected || !this.shouldUpdate()) {
            return;
        }

        startRecordingObservations(this);
        try {
            const newValue = this.callDeriver();
            this.isUpToDate = true;
            if (!equals(newValue, this.cachedState)) {
                this.cachedState = newValue;
                this._version++;
            }
        } finally {
            stopRecordingObservations();
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    private callDeriver() {
        ++derivationStackDepth;
        try {
            const { deriver, args } = this;
            return args ? deriver(...args.map(unwrap)) : deriver();
        } catch (e) {
            if (e === unresolved) {
                return unresolved;
            }
            // tslint:disable-next-line:no-console - console.error is only called when debugMode is set to true
            this.stack && console.error(e.message, this.stack);
            return new ErrorWrapper(e);
        } finally {
            --derivationStackDepth;
        }
    }

    /**
     * Determine if this derivation needs an update (when connected). Compares the recorded dependencyVersions with the
     * current actual versions of the dependencies. If there is any mismatch between versions we need to update. Simple.
     */
    private shouldUpdate() {
        // Update the isUpToDate boolean only when it is false and we know all our dependencies (c.q. the cache is not empty).
        if (!this.isUpToDate && this.cachedState !== emptyCache) {
            this.isUpToDate = this[dependencies].every(obs => this[dependencyVersions][obs.id] === obs.version);
        }
        return !this.isUpToDate;
    }

    /**
     * Mark this derivation and all observers of this derivation as "possible outdated" or "state unknown". If this derivation is already
     * in that state, all observers of this derivation are also expected to already be in that state. This invariant should never
     * be invalidated. Any reactors we encounter are pushed into the reactorSink.
     */
    [mark](reactorSink: TrackedReactor[]) {
        // If we think we're up-to-date our observers might think the same, otherwise, we're good, cause our observers can never
        // believe the're up-to-date when any of their dependencies is not up-to-date.
        if (this.isUpToDate) {
            this.isUpToDate = false;
            for (const observer of this[observers]) {
                observer[mark](reactorSink);
            }
        }
    }

    /**
     * Connect this derivation. It will make sure that the internal cache is kept up-to-date and all reactors are notified of changes
     * until disconnected.
     */
    connect() {
        this.connected = true;
    }

    /**
     * Disconnect this derivation when not in autoCache mode. It will disconnect all remaining observers (downstream), stop all
     * reactors that depend on this derivation and disconnect all dependencies (upstream) that have no other observers.
     *
     * When in autoCache mode, it will wait a tick and then disconnect when no observers are listening.
     */
    disconnect() {
        if (this.autoCacheMode) {
            maybeDisconnectInNextTick(this);
        } else {
            this.disconnectNow();
        }
    }

    /**
     * Force disconnect.
     */
    disconnectNow() {
        this.isUpToDate = false;
        this.connected = false;
        this.cachedState = emptyCache;
        // Disconnect all observers. When an observer disconnects it removes itself from this array.
        for (let i = this[observers].length - 1; i >= 0; i--) {
            this[observers][i].disconnect();
        }
        for (const dep of this[dependencies]) {
            removeObserver(dep, this);
        }
        this[dependencies].length = 0;
    }

    autoCache() {
        this.autoCacheMode = true;
        return this;
    }
}

export function maybeDisconnectInNextTick(derivation: TrackedObservable & { disconnectNow(): void }) {
    setTimeout(() => derivation[observers].length || derivation.disconnectNow(), 0);
}

export function deriveMethod<V extends P, R, P>(
    this: Derivable<V>,
    f: (v: V, ...ps: P[]) => R,
    ...ps: Array<P | Derivable<P>>
): Derivable<R> {
    return new Derivation(f, [this, ...ps]);
}
