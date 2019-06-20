import { BaseDerivable } from '../derivable';
import { ReactorOptions, State, ToPromiseOptions } from '../interfaces';
import { disconnect, emptyCache, internalGetState, mark, unresolved } from '../symbols';
import { addObserver, independentTracking, Observer, removeObserver } from '../tracking';
import { augmentStack, equals, ErrorWrapper, FinalWrapper, prepareCreationStack, uniqueId } from '../utils';

// Adds the react and toPromise methods to Derivables.
export interface DerivableReactorExtension<V> {
    /**
     * React on changes of the this derivable. Will continue to run indefinitely until either garbage collected or limited by
     * the provided lifecycle options. Returns a callback function that can be used to stop the reactor indefinitely.
     *
     * @param reaction function to call on each reaction
     * @param options lifecycle options
     */
    react(reaction: (value: V, stop: () => void) => void, options?: Partial<ReactorOptions<V>>): () => void;

    /**
     * Returns a promise that resolves with the first value that passes the lifecycle options. Reject on any error in an upstream
     * derivable.
     *
     * @param options lifecycle options
     */
    toPromise(options?: Partial<ToPromiseOptions<V>>): Promise<V>;
}

declare module '../interfaces' {
    export interface Derivable<V> extends DerivableReactorExtension<V> { }
}
declare module '../derivable/base-derivable' {
    export interface BaseDerivable<V> extends DerivableReactorExtension<V> { }
}

BaseDerivable.prototype.react = function react(reaction, options) {
    return independentTracking(() => Reactor.create(this, reaction, options));
};

BaseDerivable.prototype.toPromise = function toPromise(options) {
    return new Promise((resolve, reject) => this.react(resolve, {
        ...options,
        once: true,
        onError(err, done) { done(); reject(err); }
    }));
};

/**
 * The maximum recursion depth for a single Reactor. Is used to fail faster than JavaScripts "Maximum call stack size
 * exceeded" and provide better error messages.
 */
const MAX_REACTION_DEPTH = 100;

/**
 * A Reactor is an observer of a derivable that automatically performs some reaction whenever the derivable changes. Will not
 * react to changes when a transaction is active. When all transactions are committed all pending reactors will fire. Note that a
 * reactor that is created inside a transaction will still fire the first time (unless skipFirst = true), but will not react
 * to changes until the transaction ends.
 */
export class Reactor<V> implements Observer {
    /**
     * When a reactor is active it observes its derivable (parent) and reacts to changes.
     * @internal
     */
    _active = false;

    /**
     * Unique ID for debugging purposes.
     */
    readonly id = uniqueId();

    /**
     * The current recursion depth of reactions. Can reach a maximum at which point an Error will be thrown.
     * @internal
     */
    private _reactionDepth = 0;

    /**
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    readonly creationStack = prepareCreationStack(this);

    /**
     * The value of the parent when this reactor last reacted. Is used to determine whether it should react again or not.
     * @internal
     */
    private _lastValue: V | ErrorWrapper | FinalWrapper<State<V>> | typeof emptyCache = emptyCache;

    /**
     * Create a new instance of Reactor, do not use this directly, use {@link Reactor.create} instead.
     *
     * @param _parent the derivable that should be observed
     * @param _reaction the reaction that should fire
     */
    protected constructor(
        /**
         * The derivable that is observed to determine changes.
         * @internal
         */
        private readonly _parent: BaseDerivable<V>,

        /**
         * The error handler, is called when either the observed derivable or the reactor throws.
         * @internal
         */
        private readonly _errorHandler: (error: any) => void,

        /**
         * The reaction that should fire when the derivable changes.
         * @internal
         */
        private readonly _reaction: (value: V, stop: () => void) => void,

        /**
         * A callback that gets fired when this reactor is shutdown.
         */
        private readonly ended?: () => void,
    ) { }

    /**
     * Start this reactor. Will always run the reaction once with the current value of parent on start.
     * @internal
     */
    _start() {
        addObserver(this._parent, this);
        this._active = true;
        this._reactIfNeeded();
    }

    /**
     * React when active and needed. Does nothing when a reaction is not appropriate.
     * @internal
     */
    _reactIfNeeded() {
        if (!this._active) {
            return;
        }

        const maybeReact = (nextValue: State<V>) => () => {
            if (nextValue !== unresolved && !equals(this._lastValue, nextValue)) {
                this._lastValue = nextValue;
                if (nextValue instanceof ErrorWrapper) {
                    this._errorHandler(nextValue.error);
                } else {
                    this._react(nextValue);
                }
            }
        };

        const nextState = this._parent[internalGetState]();
        if (nextState instanceof FinalWrapper) {
            // nextValue = nextValue.value;
            this._stop(maybeReact(nextState.value));
        } else {
            maybeReact(nextState)();
        }
    }

    /**
     * React once. Will call the reaction with the current value of parent and remember the current version of the parent to
     * be able to determine when to react next.
     * @internal
     */
    private _react(value: V) {
        this._reactionDepth++;
        try {
            if (this._reactionDepth > MAX_REACTION_DEPTH) {
                throw new Error('Too deeply nested synchronous cyclical reactions disallowed. Use setImmediate.');
            }
            this._reaction(value, () => this._stop());
        } catch (e) {
            this._errorHandler(augmentStack(e, this));
        } finally {
            this._reactionDepth--;
        }
    }

    /**
     * Stop reacting on parent changes, will remove this reactor as an observer from the parent which might disconnect the parent.
     * @internal
     */
    _stop(lastWish?: () => void) {
        if (!this._active) {
            return;
        }
        this._active = false;
        removeObserver(this._parent, this);
        lastWish && lastWish();
        this.ended && this.ended();
    }

    /**
     * If for some reason any upstream derivable is ordered to disconnect, we have to disconnect as well, which means: stop the reactor.
     */
    [disconnect]() {
        this._stop();
    }

    /**
     * During the mark phase add this reactor to the reactorSink. This way, the transaction knows we exist and we get to `reactIfNeeded`
     * later on.
     */
    [mark](reactorSink: Array<Reactor<any>>): void {
        if (reactorSink.indexOf(this) < 0) {
            reactorSink.push(this);
        }
    }

    /**
     * Create a new Reactor with lifecycle options. This is the only way to create a new Reactor. Returns a callback function that can
     * be used to stop the reactor indefinitely.
     *
     * @param parent the derivable to react on
     * @param reaction the function to call on each reaction
     * @param options lifecycle options
     * @param ended an optional callback that fires when the reactor is stopped indefinitely (by once or until option)
     */
    static create<W>(
        parent: BaseDerivable<W>,
        reaction: (value: W, stop: () => void) => void,
        options?: Partial<ReactorOptions<W>>,
        ended?: () => void,
    ) {
        const controlledDerivable = options ? parent.take(options) as BaseDerivable<W> : parent;
        const reactor = new Reactor<W>(controlledDerivable, errorHandler, reaction, ended);

        function done() {
            reactor._stop();
        }

        function errorHandler(error: any) {
            if (options && options.onError) {
                options.onError(error, done);
            } else {
                done();
                throw error;
            }
        }

        // Go!!!
        reactor._start();

        return done;
    }
}
