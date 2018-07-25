import { _internal, Derivable, derive, inTransaction, ReactorOptionValue, safeUnwrap, State, unwrap } from '@politie/sherlock';
import { fromStateObject, materialize, StateObject } from './state';

export interface ControlFlowOptions<V> {
    /**
     * Indicates when the derivable should become active. The output derivable gets its first value when `from` becomes true. After that `from` is
     * not observed anymore.
     */
    from?: ReactorOptionValue<V>;

    /**
     * Indicates when the derivable should stop updating. The updates are stopped indefinitely when `until` becomes false.
     */
    until?: ReactorOptionValue<V>;

    /**
     * Indicates when the derivable should update, starts and stops the updates whenever the value changes. The first time
     * `when` becomes true, `skipFirst` is respected if applicable. After that the derivable will update each time `when` becomes
     * true and the parent derivable has a value that differs from the current value of the output derivable.
     */
    when?: ReactorOptionValue<V>;

    /**
     * When `true` the derivable will update only once, after which it will stop updating indefinitely.
     */
    once?: boolean;

    /**
     * When `true` the derivable will not update the first time it receives an update from the parent derivable. After that it has no effect.
     */
    skipFirst?: boolean;

    /*
     * Indicates whether an update to unresolved state is considered an update. Default: false.
     */
    includeUnresolved?: boolean;
}

// tslint:disable-next-line:ban-types
type PreparedOptions<V> = { [P in keyof ControlFlowOptions<V>]?: Exclude<ControlFlowOptions<V>[P], Function> };

class ControlFlow<V> extends _internal.BaseDerivable<V> implements Derivable<V> {
    private readonly opts: PreparedOptions<V>;

    constructor(
        private readonly base: Derivable<V>,
        opts?: ControlFlowOptions<V>,
    ) {
        super();
        this.opts = prepareOptions(base, opts);
    }

    /**
     * The last state that was calculated for this derivable. Is only used when connected.
     * @internal
     */
    private _currentState: State<V> = _internal.symbols.unresolved;

    /** @internal */
    private _baseConnectionStopper?: () => void = undefined;

    /**
     * The current version of the state. This number gets incremented every time the state changes when connected. The version
     * is only guaranteed to increase on each change when connected.
     */
    version = 0;

    [_internal.symbols.internalGetState]() {
        _internal.recordObservation(this);
        if (this.connected && !inTransaction() || !shouldBeLive(this.opts)) {
            return this._currentState;
        }
        return _internal.independentTracking(() => this.base.getState());
    }

    [_internal.symbols.connect]() {
        let stopped = false;

        // tslint:disable-next-line:prefer-const
        let { once, skipFirst, ...opts } = this.opts;

        const stop = () => {
            stopped = true;
            this._disconnectFromBase();
        };
        const update = (newState: StateObject<V>) => {
            if (this.opts && this.opts.includeUnresolved || newState.resolved) {
                if (skipFirst) {
                    skipFirst = false;
                } else {
                    once && stop();
                    const oldState = this._currentState;
                    this._currentState = fromStateObject(newState);
                    _internal.processChangedAtom(this, oldState, this.version++);
                }
            }
        };

        const mBase = materialize(this.base) as _internal.BaseDerivable<StateObject<V>>;
        const stopper = _internal.Reactor.create(mBase, update, opts, stop);
        if (stopped) {
            stopper();
        } else {
            this._baseConnectionStopper = stopper;
        }

        super[_internal.symbols.connect]();
    }

    private _disconnectFromBase() {
        if (this._baseConnectionStopper) {
            const stopper = this._baseConnectionStopper;
            this._baseConnectionStopper = undefined;
            stopper();
        }
    }

    [_internal.symbols.disconnect]() {
        super[_internal.symbols.disconnect]();
        this._currentState = _internal.symbols.unresolved;
        this._disconnectFromBase();
    }
}

export function controlFlow<V>(base: Derivable<V>, opts?: ControlFlowOptions<V>): Derivable<V> {
    return new ControlFlow(base, opts);
}

function shouldBeLive<V>(opts?: PreparedOptions<V>): boolean {
    return !opts || !opts.skipFirst &&
        (opts.from === undefined || safeUnwrap(opts.from) === true) &&
        (opts.until === undefined || safeUnwrap(opts.until) === false) &&
        (opts.when === undefined || safeUnwrap(opts.when) === true);
}

function prepareOptions<V>(base: Derivable<V>, opts?: ControlFlowOptions<V>, ): PreparedOptions<V> {
    const result: PreparedOptions<V> = {};
    if (opts) {
        for (const key of Object.keys(opts) as Array<keyof typeof opts>) {
            const opt = opts[key];
            result[key] = typeof opt === 'function' ? derive(() => unwrap(opt(base))) : opt;
        }
    }
    return result;
}
