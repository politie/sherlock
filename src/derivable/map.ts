import { Derivable, MaybeFinalState, SettableDerivable, State } from '../interfaces';
import { connect, disconnect, finalize, unresolved } from '../symbols';
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
        this._baseVersion = this._base.version;
        super._update();
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     * @internal
     */
    protected _callDeriver() {
        try {
            return independentTracking(() => {
                const baseValue = this._base.getMaybeFinalState();
                return FinalWrapper.map<State<B>, State<V>>(baseValue, v => this._pureGetter(v));
            });
        } catch (e) {
            return new ErrorWrapper(augmentStack((e as Error), this));
        }
    }

    /** @internal */
    protected _compareVersions() {
        return this._baseVersion === this._base.version;
    }

    [connect]() {
        super[connect]();
        this.connected && addObserver(this._base, this);
    }

    /**
     * Force disconnect.
     */
    [disconnect]() {
        removeObserver(this._base, this);
        super[disconnect]();
    }

    [finalize]() {
        super[finalize]();
        // Allow Garbage Collection once we reach final state.
        (this as any)._base = undefined;
        (this as any)._pureGetter = undefined;
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
        if (this.finalized) {
            throw augmentStack(new Error('cannot set a final derivable'), this);
        }
        // Cast to B here instead of broadening the interface of set method. Should in practice always support State<B>.
        this._base.set(FinalWrapper.map(newValue, v => this._pureSetter(v)) as B);
    }

    get settable() {
        return this._base.settable;
    }

    [finalize]() {
        super[finalize]();
        // Allow Garbage Collection once we reach final state.
        (this as any)._pureSetter = undefined;
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
