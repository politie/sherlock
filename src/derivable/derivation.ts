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

        /**
         * Create a derivation that plucks the property with the given key of the current value of the Derivable.
         *
         * @param key the key or derivable to a key that should be used to dereference the current value
         */
        pluck<K extends keyof V>(key: K | Derivable<K>): Derivable<V[K]>;
        pluck(key: string | number | Derivable<string | number>): Derivable<any>;
    }
}

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
     * between. Should always be kept up to date in order to prevent memory leaks.
     */
    private connected = false;

    /**
     * Indicates whether the current cachedValue of this derivation is known to be up to date, or might need an update. Is set to false
     * by our dependencies when needed. We should be able to trust `true`.
     */
    private isUpToDate = false;

    /**
     * The last value that was calculated for this derivation. Is only used when connected.
     */
    private cachedValue?: V;

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
        if (this.connected && this.shouldUpdate()) { this.update(); }
        return this._version;
    }

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    get(): V {
        if (this.autoCacheMode && !this.connected) {
            // We will connect because of autoCacheMode in next block, after a tick we maybe need to disconnect (if no reactor was started
            // in this tick).
            this.maybeDisconnectInNextTick();
        }
        // Are we currently connected or should we connect now? We know we need to connect if an observer is registered or
        // isRecordingObservations() returns true (in which case our observer is connecting and therefore recording its dependencies).
        if (this.autoCacheMode || this.observers.length || isRecordingObservations()) {
            recordObservation(this);
            // If we are not connected we should connect (by calling update). Otherwise ask shouldUpdate().
            if (!this.connected || this.shouldUpdate()) {
                this.update();
            }
            if (this.cachedError) {
                throw this.cachedError;
            }
            return this.cachedValue!;
        }
        return this.callDeriver();
    }

    /**
     * Ensure the derivable is connected and update the currently cached value of this derivation.
     */
    private update() {
        startRecordingObservations(this);
        const oldValue = this.cachedValue;
        try {
            const newValue = this.cachedValue = this.callDeriver();
            this.cachedError = undefined;
            this.isUpToDate = true;
            this.connected = true;
            if (!equals(newValue, oldValue)) {
                this._version++;
            }
        } catch (error) {
            this.cachedError = error;
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
        // Update the isUpToDate boolean only when it is false.
        if (!this.isUpToDate) {
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
     * Disconnect this derivation. It will disconnect all remaining observers (downstream), stop all reactors that depend on this
     * derivation and disconnect all dependencies (upstream) that have no other observers.
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

    private disconnectNow() {
        this.isUpToDate = false;
        this.connected = false;
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

Derivable.prototype.pluck = function pluck(this: Derivable<any>, key: string | number | Derivable<string | number>) {
    return this.derive(plucker, key);
};

export function plucker(obj: any, key: string | number) {
    return hasGetter(obj)
        ? obj.get(key)
        : obj[key];
}

export function hasGetter(obj: any): obj is { get(key: string | number): any } {
    return obj && typeof obj.get === 'function';
}
