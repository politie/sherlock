import { BaseDerivable, Constant, Derivation, unwrap } from '../derivable';
import { Derivable, ReactorOptions, ReactorOptionValue, ToPromiseOptions } from '../interfaces';
import { emptyCache, getState, mark, unresolved } from '../symbols';
import { addObserver, Observer, removeObserver } from '../tracking';
import { config, equals, ErrorWrapper, uniqueId } from '../utils';

// Adds the react and toPromise methods to Derivables.
declare module '../derivable/extension' {
    export interface DerivableExtension<V> {
        /**
         * React on changes of the this derivable. Will continue to run indefinitely until either garbage collected or limited by
         * the provided lifecycle options. Returns a callback function that can be used to stop the reactor indefinitely.
         *
         * @param reaction function to call on each reaction
         * @param options lifecycle options
         */
        react(reaction: (value: V) => void, options?: Partial<ReactorOptions<V>>): () => void;

        /**
         * Returns a promise that resolves with the first value that passes the lifecycle options. Reject on any error in an upstream
         * derivable.
         *
         * @param options lifecycle options
         */
        toPromise(options?: Partial<ToPromiseOptions<V>>): Promise<V>;
    }
}

const true$ = new Constant(true);
const false$ = new Constant(false);

BaseDerivable.prototype.react = function react(reaction, options) {
    return Reactor.create(this, reaction, options);
};

BaseDerivable.prototype.toPromise = function toPromise(options) {
    return new Promise((resolve, reject) => this.react(resolve, { ...options, once: true, onError: reject }));
};

/**
 * The maximum recursion depth for a single Reactor. Is used to fail faster than JavaScripts "Maximum call stack size
 * exceeded" and provide better error messages.
 */
const MAX_REACTION_DEPTH = 100;

export const defaultOptions: ReactorOptions<any> = {
    from: true$,
    until: false$,
    when: true$,
    once: false,
    skipFirst: false,
    onError: undefined,
};

/**
 * A Reactor is an observer of a derivable that automatically performs some reaction whenever the derivable changes. Will not
 * react to changes when a transaction is active. When all transactions are committed all pending reactors will fire. Note that a
 * reactor that is created inside a transaction will still fire the first time (unless skipFirst = true), but will not react
 * to changes until the transaction ends.
 */
export class Reactor<V> implements Observer {
    /**
     * A Reactor can have a controller that should always be allowed to react before the current Reactor reacts.
     */
    controller?: Reactor<any>;

    /**
     * When a reactor is active it observes its derivable (parent) and reacts to changes.
     */
    active = false;

    /**
     * Unique ID for debugging purposes.
     */
    readonly id = uniqueId();

    /**
     * The current recursion depth of reactions. Can reach a maximum at which point an Error will be thrown.
     */
    private reactionDepth = 0;

    /**
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    private readonly stack = config.debugMode ? new Error().stack : undefined;

    /**
     * The value of the parent when this reactor last reacted. Is used to determine whether it should react again or not.
     */
    private lastValue: V | typeof emptyCache | typeof unresolved = emptyCache;

    /**
     * Create a new instance of Reactor, do not use this directly, use {@link Reactor.create} instead.
     *
     * @param parent the derivable that should be observed
     * @param reaction the reaction that should fire
     */
    protected constructor(
        /**
         * The derivable that is observed to determine changes.
         */
        private readonly parent: BaseDerivable<V>,

        /**
         * The error handler, is called when either the observed derivable or the reactor throws.
         */
        private readonly errorHandler: (error: any) => void,

        /**
         * The reaction that should fire when the derivable changes.
         */
        private readonly reaction: (value: V) => void,
    ) { }

    /**
     * Start this reactor if not already started. Will always run the reaction once with the current value of parent on start.
     */
    start() {
        if (this.active) {
            return;
        }
        addObserver(this.parent, this);
        this.active = true;
        this.reactIfNeeded();
    }

    /**
     * React when active and needed. Does nothing when a reaction is not appropriate.
     */
    reactIfNeeded() {
        if (!this.active) {
            return;
        }

        // Our controller always has first right to react.
        if (this.controller) {
            this.controller.reactIfNeeded();
        }

        // Check active again, could have been stopped by controller now.
        if (!this.active) {
            return;
        }

        const { lastValue } = this;
        const nextValue = this.parent[getState]();
        if (nextValue instanceof ErrorWrapper) {
            this.errorHandler(nextValue.error);
        } else if (nextValue !== unresolved && !equals(lastValue, nextValue)) {
            this.lastValue = nextValue;
            this.react(nextValue);
        }
    }

    /**
     * React once. Will call the reaction with the current value of parent and remember the current version of the parent to
     * be able to determine when to react next.
     */
    private react(value: V) {
        this.reactionDepth++;
        try {
            if (this.reactionDepth > MAX_REACTION_DEPTH) {
                throw new Error('Too deeply nested synchronous cyclical reactions disallowed. Use setImmediate.');
            }
            this.reaction(value);
        } catch (e) {
            // tslint:disable-next-line:no-console - console.error is only called when debugMode is set to true
            this.stack && console.error(e.message, this.stack);
            this.errorHandler(e);
        } finally {
            this.reactionDepth--;
        }
    }

    /**
     * Stop reacting on parent changes, will remove this reactor as an observer from the parent which might disconnect the parent.
     */
    stop() {
        if (!this.active) {
            return this;
        }
        this.active = false;
        removeObserver(this.parent, this);
        return this;
    }

    /**
     * If for some reason any upstream derivable is ordered to disconnect, we have to disconnect as well, which means: stop the reactor.
     */
    disconnect() {
        this.stop();
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
        reaction: (value: W) => void,
        options?: Partial<ReactorOptions<W>>,
        ended?: () => void,
    ) {
        const resolvedOptions = { ...defaultOptions, ...options };
        const { from, until, when, once } = resolvedOptions;
        let { skipFirst } = resolvedOptions;

        // Wrap the reaction to enforce skipFirst and once.
        const reactor = new Reactor<W>(parent, errorHandler, value => {
            if (skipFirst) {
                skipFirst = false;
            } else {
                reaction(value);
                if (once) {
                    done();
                }
            }
        });

        // Listen to when and until conditions, starting and stopping the reactor when
        // needed, and stopping the reaction and controller when until becomes true.
        const controller = (when === true || when === true$) && (until === false || until === false$)
            ? undefined
            : new Reactor(combineWhenUntil(parent, when, until), errorHandler, conds => {
                if (conds.until) {
                    done();
                } else if (conds.when) {
                    reactor.start();
                } else if (reactor.active) {
                    reactor.stop();
                }
            });

        // The controller needs to act before the reactor in order to ensure deterministic until and when behavior.
        reactor.controller = controller;

        // The starter waits until `from` to start the controller.
        const starter = from === true || from === true$
            ? undefined
            : new Reactor(toDerivable(from, parent), errorHandler, value => {
                if (value) {
                    (controller || reactor).start();
                    starter!.stop();
                }
            });

        function done() {
            starter && starter.stop();
            controller && controller.stop();
            reactor.stop();
            ended && ended();
        }

        function errorHandler(error: any) {
            done();
            if (resolvedOptions.onError) {
                resolvedOptions.onError(error);
            } else {
                throw error;
            }
        }

        // Go!!!
        (starter || controller || reactor).start();

        return done;
    }
}

export function toDerivable<V>(option: ReactorOptionValue<V>, derivable: Derivable<V>) {
    if (option instanceof BaseDerivable) {
        return option;
    }
    if (typeof option === 'function') {
        return new Derivation(() => unwrap(option(derivable)));
    }
    return option ? true$ : false$;
}

function combineWhenUntil<V>(parent: Derivable<V>, whenOption: ReactorOptionValue<V>, untilOption: ReactorOptionValue<V>) {
    const when$ = toDerivable(whenOption, parent);
    const until$ = toDerivable(untilOption, parent);
    return new Derivation((when, until) => ({ when, until }), [when$, until$]);
}
