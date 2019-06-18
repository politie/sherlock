import { Derivable, MaybeFinalState, SettableDerivable, State } from '../interfaces';
import { connect, disconnect, unresolved } from '../symbols';
import { addObserver, independentTracking, removeObserver } from '../tracking';
import { augmentStack, ErrorWrapper, FinalWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { BaseDerivation } from './derivation';

export class Mapping<B, V> extends BaseDerivation<V> implements Derivable<V> {
    constructor(
        /** @internal */
        readonly _base: BaseDerivable<B>,
        /** @internal */
        private readonly _pureGetter: (this: Mapping<B, V>, state: State<B>) => MaybeFinalState<V>,
    ) { super(); }

    /** @internal */
    private _baseVersion = 0;

    /**
     * Update the currently cached value of this derivation (only when connected).
     * @internal
     */
    protected _update() {
        super._update();
        this._baseVersion = this._base.version;
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     * @internal
     */
    protected _callDeriver() {
        try {
            return independentTracking(() => {
                const baseValue = this._base.getMaybeFinalState();
                const forceFinal = baseValue instanceof FinalWrapper;
                const mappedValue = this._pureGetter(FinalWrapper.unwrap(baseValue));
                return forceFinal ? FinalWrapper.wrap(mappedValue) : mappedValue;
            });
        } catch (e) {
            return new ErrorWrapper(augmentStack(e, this));
        }
    }

    /** @internal */
    protected _compareVersions() {
        return this._baseVersion === this._base.version;
    }

    [connect]() {
        if (this._final) { return; }
        super[connect]();
        addObserver(this._base, this);
    }

    /**
     * Force disconnect.
     */
    [disconnect]() {
        super[disconnect]();
        removeObserver(this._base, this);
    }
}

export class BiMapping<B, V> extends Mapping<B, V> implements SettableDerivable<V> {
    /** @internal */
    readonly _base!: BaseDerivable<B> & SettableDerivable<B>;

    constructor(
        base: BaseDerivable<B> & SettableDerivable<B>,
        pureGet: (this: Mapping<B, V>, baseValue: State<B>) => MaybeFinalState<V>,
        private readonly _pureSetter: (this: BiMapping<B, V>, newValue: State<V>) => State<B>,
    ) {
        super(base, pureGet);
    }

    set(newValue: V) {
        // Cast to B here instead of broadening the interface of set method. Should in practice always support State<B>.
        this._base.set(this._pureSetter(newValue) as B);
    }

    get settable() {
        return this._base.settable;
    }
}

export function mapMethod<B, V>(this: BaseDerivable<B>, get: (b: B) => MaybeFinalState<V>, set?: (v: V, b?: B) => B): Derivable<V> {
    const stateMapper = function (this: Mapping<B, V>, state: State<B>) {
        return state === unresolved || state instanceof ErrorWrapper ? state : get.call(this, state);
    };
    return set && isSettable(this)
        ? new BiMapping(this, stateMapper, function (v) { return v === unresolved || v instanceof ErrorWrapper ? v : set.call(this, v, this._base.value); })
        : new Mapping(this, stateMapper);
}

export function mapStateMethod<B, V>(this: BaseDerivable<B>, get: (state: State<B>) => MaybeFinalState<V>, set?: (v: V, b: State<B>) => B): Derivable<V> {
    return set && isSettable(this)
        ? new BiMapping(this, get, function (v) { return set.call(this, v as V, this._base.getState()); })
        : new Mapping(this, get);
}

function isSettable<V>(obj: BaseDerivable<V>): obj is BaseDerivable<V> & SettableDerivable<V> {
    return obj.settable;
}
