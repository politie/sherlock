import { _internal, Derivable, derive, inTransaction, ReactorOptions, safeUnwrap, State, unwrap } from '@politie/sherlock';

export type FilterUpdatesOptions<V> = Partial<Pick<ReactorOptions<V>, Exclude<keyof ReactorOptions<V>, 'onError'>>>;
// tslint:disable-next-line:ban-types
type PreparedOptions<V> = { [P in keyof FilterUpdatesOptions<V>]?: Exclude<FilterUpdatesOptions<V>[P], Function> };

class FilterUpdates<V> extends _internal.BaseDerivable<V> implements Derivable<V> {
    private readonly opts?: PreparedOptions<V>;

    constructor(
        private readonly base: _internal.BaseDerivable<V>,
        opts?: FilterUpdatesOptions<V>,
    ) {
        super();
        this.opts = opts && prepareOptions(base, opts);
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

function shouldBeLive<V>(opts?: PreparedOptions<V>): boolean {
    return !opts || !opts.skipFirst &&
        (opts.from === undefined || safeUnwrap(opts.from) === true) &&
        (opts.until === undefined || safeUnwrap(opts.until) === false) &&
        (opts.when === undefined || safeUnwrap(opts.when) === true);
}

function prepareOptions<V>(base: Derivable<V>, opts: FilterUpdatesOptions<V>, ): PreparedOptions<V> {
    const result: PreparedOptions<V> = {};
    for (const key of Object.keys(opts) as Array<keyof typeof opts>) {
        const opt = opts[key];
        result[key] = typeof opt === 'function' ? derive(() => unwrap(opt(base))) : opt;
    }
    return result;
}
