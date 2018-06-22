import { Derivable, State } from '../interfaces';
import { getState } from '../symbols';
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
    ) {
        super();
    }

    [getState]() {
        return this._state;
    }

    readonly version!: 0;
    readonly settable!: false;
}
Object.defineProperties(Constant.prototype, {
    version: { value: 0 },
    settable: { value: false },
});
