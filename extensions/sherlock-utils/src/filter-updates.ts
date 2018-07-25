import { _internal, Derivable, inTransaction, ReactorOptions, ReactorOptionValue, safeUnwrap, State } from '@politie/sherlock';

export type FilterUpdatesOptions<V> = Partial<Pick<ReactorOptions<V>, Exclude<keyof ReactorOptions<V>, 'onError'>>>;

class FilterUpdates<V> extends _internal.BaseDerivable<V> implements Derivable<V> {
    constructor(
        private readonly base: _internal.BaseDerivable<V>,
        private readonly opts?: FilterUpdatesOptions<V>,
    ) { super(); }

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
        if (this.connected && !inTransaction() || !shouldBeLive(this.base, this.opts)) {
            return this._currentState;
        }
        return _internal.independentTracking(() => this.base.getState());
    }

    [_internal.symbols.connect]() {
        let connecting = true;

        const update = (newState: State<V>) => {
            const oldState = this._currentState;
            this._currentState = newState;
            _internal.processChangedAtom(this, oldState, this.version++);
        };
        const onError = (err: any) => update(new _internal.ErrorWrapper(err));
        const cleanup = () => {
            connecting = false;
            this._baseConnectionStopper = undefined;
        };

        const stopper = _internal.Reactor.create(this.base, update, { ...this.opts, onError }, cleanup);
        if (connecting) {
            connecting = false;
            this._baseConnectionStopper = stopper;
        }

        super[_internal.symbols.connect]();
    }

    private _disconnectFromBase() {
        if (this._baseConnectionStopper) {
            this._baseConnectionStopper();
            this._baseConnectionStopper = undefined;
        }
    }

    [_internal.symbols.disconnect]() {
        super[_internal.symbols.disconnect]();
        this._currentState = _internal.symbols.unresolved;
        this._disconnectFromBase();
    }
}

export function filterUpdates<V>(base: Derivable<V>, opts?: FilterUpdatesOptions<V>): Derivable<V> {
    return new FilterUpdates(base as _internal.BaseDerivable<V>, opts);
}

function shouldBeLive<V>(base: Derivable<V>, opts?: FilterUpdatesOptions<V>): boolean {
    function checkValue(opt: ReactorOptionValue<V>, want: boolean) {
        const value = safeUnwrap(typeof opt === 'function' ? opt(base) : opt);
        return value === want;
    }

    return !opts || !opts.skipFirst &&
        (!opts.from || checkValue(opts.from, true)) &&
        (!opts.until || checkValue(opts.until, false)) &&
        (!opts.when || checkValue(opts.when, true));
}
