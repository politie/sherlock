import { Derivable, State } from '../interfaces';
import { connect, internalGetState } from '../symbols';
import { augmentState } from '../utils';
import { BaseDerivable } from './base-derivable';

/**
 * Constant represents a basic immutable building block of derivations.
 */
export class Constant<V> extends BaseDerivable<V> implements Derivable<V> {
    /**
     * The readonly state of this Constant.
     * @internal
     */
    private readonly _state: State<V>;

    /**
     * Creates a new Constant with the given state.
     *
     * @paramstate the readonly state of this Constant
     */
    constructor(state: State<V>) {
        super();
        this._state = augmentState(state, this);
    }

    // No connection should ever be made.
    getState() { return this[internalGetState](); }
    [internalGetState]() { return this._state; }
    [connect]() { /* nop */ }

    readonly connected!: false;
    readonly version!: 0;
    readonly settable!: false;
}
Object.defineProperties(Constant.prototype, {
    version: { value: 0 },
    settable: { value: false },
});
