import {
    isRecordingObservations, Reactor, recordObservation, removeObserver, startRecordingObservations,
    stopRecordingObservations, TrackedObservable, TrackedObserver,
} from '../tracking';
import { debugMode, equals } from '../utils';
import { Derivable } from './derivable';
import { unpack } from './unpack';

// Augments the Derivable interface with the following methods:
declare module './derivable' {
    // tslint:disable-next-line:no-shadowed-variable
    export interface Derivable<V> {
        /**
         * Create a derivation based on this Derivable and the given deriver function.
         *
         * @param f the deriver function
         */
        derive<R>(f: (v: V) => R): Derivable<R>;
        derive<R, P1>(f: (v: V, p1: P1) => R, p1: P1 | Derivable<P1>): Derivable<R>;
        derive<R, P1, P2>(f: (v: V, p1: P1, p2: P2) => R, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
        derive<R, P>(f: (v: V, ...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R>;
    }
}

export const EMPTY_CACHE = {};

/**
 * Derivation is the implementation of derived state. Automatically tracks other Derivables that are used in the deriver function
 * and updates when needed.
 */
export class Derivation<V> extends Derivable<V> implements TrackedObserver {
    /**
     * @internal
     * The recorded dependencies of this derivation. Is only used when the derivation is connected (i.e. it is actively used to
     * power a reactor, either directly or indirectly with other derivations in between).
     */
    readonly dependencies: TrackedObservable[] = [];

    /**
     * @internal
     * The versions of all dependencies that were used to calculate the currently known value. Is used to determine whether
     * the deriver function needs to be called.
     */
    readonly dependencyVersions: { [id: number]: number } = {};

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
    private cachedValue = EMPTY_CACHE as V;

    /**
     * The error that was caught while calculating the derivation. Is only used when connected.
     */
    private cachedError?: Error;

    /**
     * Indicates whether the derivation is in autoCache mode.
     */
    private autoCacheMode = false;

    /**
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    private readonly stack = debugMode ? Error().stack : undefined;

    /**
     * Create a new Derivation using the deriver function.
     *
     * @param deriver the deriver function
     */
    constructor(
        /**
         * The deriver function that is used to calculate the value of this derivation.
         */
        private readonly deriver: (...args: any[]) => V,
        /**
         * Arguments that will be passed unpacked to the deriver function.
         */
        protected readonly args?: any[],
    ) {
        super();
    }

    private _version = 0;

    /**
     * @internal
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    get version() {
        this.updateIfNeeded();
        return this._version;
    }

    /**
     * `#value` is an alias for the `#get()` method on the Derivable. Getting `#value` will return the same value as `#get()`
     * It is readonly on derivations.
     */
    get value() {
        return this.get();
    }

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    get(): V {
        // Should we connect now?
        if (!this.connected) {
            if (this.autoCacheMode) {
                // We will connect because of autoCacheMode, after a tick we may need to disconnect (if no reactor was started
                // in this tick).
                this.connect();
                this.maybeDisconnectInNextTick();
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

        // We are connected, so we should record this instance as a dependency of our observers.
        recordObservation(this);
        this.updateIfNeeded();
        if (this.cachedError) {
            throw this.cachedError;
        }
        return this.cachedValue;
    }

    /**
     * Update the currently cached value of this derivation (only when connected).
     */
    private updateIfNeeded() {
        if (!this.connected || !this.shouldUpdate()) {
            return;
        }

        startRecordingObservations(this);
        const oldValue = this.cachedValue;
        try {
            const newValue = this.callDeriver();
            this.cachedError = undefined;
            this.isUpToDate = true;
            if (!equals(newValue, oldValue)) {
                this.cachedValue = newValue;
                this._version++;
            }
        } catch (error) {
            this.cachedError = error;
            this._version++;
        } finally {
            stopRecordingObservations();
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    private callDeriver() {
        try {
            const { deriver, args } = this;
            return args ? deriver(...args.map(unpack)) : deriver();
        } catch (e) {
            // tslint:disable-next-line:no-console - console.error is only called when debugMode is set to true
            this.stack && console.error(e.message, this.stack);
            throw e;
        }
    }

    /**
     * Determine if this derivation needs an update (when connected). Compares the recorded dependencyVersions with the
     * current actual versions of the dependencies. If there is any mismatch between versions we need to update. Simple.
     */
    private shouldUpdate() {
        // Update the isUpToDate boolean only when it is false and we know all our dependencies (c.q. the cache is not empty).
        if (!this.isUpToDate && this.cachedValue !== EMPTY_CACHE) {
            this.isUpToDate = this.dependencies.every(obs => this.dependencyVersions[obs.id] === obs.version);
        }
        return !this.isUpToDate;
    }

    /**
     * @internal
     * Mark this derivation and all observers of this derivation as "possible outdated" or "state unknown". If this derivation is already
     * in that state, all observers of this derivation are also expected to already be in that state. This invariant should never
     * be invalidated. Any reactors we encounter are pushed into the reactorSink.
     */
    mark(reactorSink: Reactor[]) {
        // If we think we're up-to-date our observers might think the same, otherwise, we're good, cause our observers can never
        // believe the're up-to-date when any of their dependencies is not up-to-date.
        if (this.isUpToDate) {
            this.isUpToDate = false;
            for (const observer of this.observers) {
                observer.mark(reactorSink);
            }
        }
    }

    /**
     * @internal
     * Connect this derivation. It will make sure that the internal cache is kept up-to-date and all reactors are notified of changes
     * until disconnected.
     */
    connect() {
        this.connected = true;
    }

    /**
     * @internal
     * Disconnect this derivation when not in autoCache mode. It will disconnect all remaining observers (downstream), stop all
     * reactors that depend on this derivation and disconnect all dependencies (upstream) that have no other observers.
     *
     * When in autoCache mode, it will wait a tick and then disconnect when no observers are listening.
     */
    disconnect() {
        if (this.autoCacheMode) {
            this.maybeDisconnectInNextTick();
        } else {
            this.disconnectNow();
        }
    }

    private maybeDisconnectInNextTick() {
        setTimeout(() => this.observers.length || this.disconnectNow(), 0);
    }

    /**
     * Force disconnect.
     */
    protected disconnectNow() {
        this.isUpToDate = false;
        this.connected = false;
        this.cachedValue = EMPTY_CACHE as V;
        // Disconnect all observers. When an observer disconnects it removes itself from this array.
        for (let i = this.observers.length - 1; i >= 0; i--) {
            this.observers[i].disconnect();
        }
        for (const dep of this.dependencies) {
            removeObserver(dep, this);
        }
        this.dependencies.length = 0;
    }

    autoCache() {
        this.autoCacheMode = true;
        return this;
    }
}

/**
 * Create a new derivation using the deriver function.
 *
 * @param deriver the deriver function
 */
export function derivation<R>(f: () => R): Derivable<R>;
export function derivation<R, P1>(f: (p1: P1) => R, p1: P1 | Derivable<P1>): Derivable<R>;
export function derivation<R, P1, P2>(f: (p1: P1, p2: P2) => R, p1: P1 | Derivable<P1>, p2: P2 | Derivable<P2>): Derivable<R>;
export function derivation<R, P>(f: (...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R>;
export function derivation<R, P>(f: (...ps: P[]) => R, ...ps: Array<P | Derivable<P>>): Derivable<R> {
    return new Derivation(f, ps.length ? ps : undefined);
}

Derivable.prototype.derive = function derive<V extends P, R, P>(
    this: Derivable<V>,
    f: (v: V, ...ps: P[]) => R,
    ...ps: Array<P | Derivable<P>>,
): Derivable<R> {
    return new Derivation(f, [this, ...ps]);
};
