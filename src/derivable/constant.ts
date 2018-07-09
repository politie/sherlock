import { Derivable, State } from '../interfaces';
import { connect, internalGetState } from '../symbols';
import { BaseDerivable } from './base-derivable';

/**
 * Constant represents a basic immutable building block of derivations.
 */
export class Constant<V> extends BaseDerivable<V> implements Derivable<V> {
    /**
     * Creates a new Constant with the given state.
     *
     * @param _state the readonly state of this Constant
     */
    constructor(
        /**
         * The readonly state of this Constant.
         */
        private readonly _state: State<V>,
    ) { super(); }

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
