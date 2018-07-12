import { Derivable, SettableDerivable, State } from '../interfaces';
import { connect, disconnect, unresolved } from '../symbols';
import { addObserver, independentTracking, removeObserver } from '../tracking';
import { augmentStack, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { BaseDerivation } from './derivation';
import { isSettableDerivable } from './typeguards';

export class Mapping<B, V> extends BaseDerivation<V> implements Derivable<V> {
    constructor(
        protected readonly _base: BaseDerivable<B>,
        private readonly _pureFn: (this: Derivable<V>, state: State<B>) => State<V>,
    ) { super(); }

    private _baseVersion = 0;

    /**
     * Update the currently cached value of this derivation (only when connected).
     */
    protected _update() {
        super._update();
        this._baseVersion = this._base.version;
    }

    /**
     * Call the deriver function without `this` context and log debug stack traces when applicable.
     */
    protected _callDeriver() {
        try {
            return independentTracking(() => this._pureFn(this._base.getState()));
        } catch (e) {
            return new ErrorWrapper(augmentStack(e, this));
        }
    }

    protected _compareVersions() {
        return this._baseVersion === this._base.version;
    }

    [connect]() {
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
    protected readonly _base!: BaseDerivable<B> & SettableDerivable<B>;

    constructor(
        base: BaseDerivable<B> & SettableDerivable<B>,
        pureGet: (this: Derivable<V>, baseValue: State<B>) => State<V>,
        private readonly _pureSet: (this: SettableDerivable<V>, newValue: V, oldValue: B | undefined) => B,
    ) {
        super(base, pureGet);
    }

    set(newValue: V) {
        this._base.set(this._pureSet(newValue, this._base.value));
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
