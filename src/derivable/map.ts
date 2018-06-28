import { Derivable, SettableDerivable, State } from '../interfaces';
import { connect, disconnect, emptyCache, getState, mark, observers, unresolved } from '../symbols';
import { addObserver, recordObservation, removeObserver, TrackedReactor } from '../tracking';
import { config, equals, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { isSettableDerivable } from './typeguards';

export class Mapping<B, V> extends BaseDerivable<V> implements Derivable<V> {
    constructor(
        protected readonly base: BaseDerivable<B>,
        private readonly pureFn: (state: State<B>) => State<V>,
    ) { super(); }

    private baseVersion = 0;

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
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    private readonly stack = config.debugMode ? Error().stack : undefined;

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
        // Not connected, so just calculate our value one time.
        if (!this.connected) {
            return this.callDeriver();
        }

        this.updateIfNeeded();
        return this.cachedState as State<V>;
    }

    /**
     * Update the currently cached value of this derivation (only when connected).
     */
    private updateIfNeeded() {
        if (!this.connected || !this.shouldUpdate()) {
            // If deriver is not called, we still need to make sure our base is recorded as being "observed", otherwise it would be
            // removed as observation which is not what we want.
            recordObservation(this.base);
            return;
        }

        const newValue = this.callDeriver();
        this.isUpToDate = true;
        this.baseVersion = this.base.version;
        if (!equals(newValue, this.cachedState)) {
            this.cachedState = newValue;
            this._version++;
        }
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    private callDeriver() {
        try {
            const { pureFn } = this;
            return pureFn(this.base[getState]());
        } catch (e) {
            // tslint:disable-next-line:no-console - console.error is only called when debugMode is set to true
            this.stack && console.error(e.message, this.stack);
            return new ErrorWrapper(e);
        }
    }

    /**
     * Determine if this derivation needs an update (when connected). Compares the recorded dependencyVersions with the
     * current actual versions of the dependencies. If there is any mismatch between versions we need to update. Simple.
     */
    private shouldUpdate() {
        // Update the isUpToDate boolean only when it is false and we know all our dependencies (c.q. the cache is not empty).
        if (!this.isUpToDate && this.cachedState !== emptyCache) {
            this.isUpToDate = this.baseVersion === this.base.version;
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

    [connect]() {
        super[connect]();
        addObserver(this.base, this);
    }

    /**
     * Force disconnect.
     */
    [disconnect]() {
        super[disconnect]();
        this.isUpToDate = false;
        this.cachedState = emptyCache;
        // istanbul ignore if: should never happen!
        if (this[observers].length) {
            throw new Error('Inconsistent state!');
        }
        removeObserver(this.base, this);
    }
}

export class BiMapping<B, V> extends Mapping<B, V> implements SettableDerivable<V> {
    protected readonly base!: BaseDerivable<B> & SettableDerivable<B>;

    constructor(
        base: BaseDerivable<B> & SettableDerivable<B>,
        pureGet: (baseValue: State<B>) => State<V>,
        private readonly pureSet: (newValue: V, oldValue: B | undefined) => B,
    ) {
        super(base, pureGet);
    }

    set(newValue: V) {
        const { pureSet } = this;
        this.base.set(pureSet(newValue, this.base.value));
    }
}

export function mapMethod<B, V>(this: BaseDerivable<B>, get: (b: B) => State<V>, set?: (v: V, b?: B) => B): Derivable<V> {
    const stateMapper = (state: State<B>) => state === unresolved || state instanceof ErrorWrapper ? state : get(state);
    return set && isSettableDerivable(this)
        ? new BiMapping(this, stateMapper, set)
        : new Mapping(this, stateMapper);
}

export function mapStateMethod<B, V>(this: BaseDerivable<B>, f: (state: State<B>) => State<V>): Derivable<V> {
    return new Mapping(this, f);
}
