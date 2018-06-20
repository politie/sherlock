import { Derivable } from '../interfaces';
import { BaseDerivable } from './base-derivable';
import { getValueOrUnresolved, unresolved } from './symbols';

/**
 * Constant represents a basic immutable building block of derivations.
 */
export class Constant<V> extends BaseDerivable<V> implements Derivable<V> {
    /**
     * Creates a new Constant with the give value.
     *
     * @param value the readonly value of this Constant
     */
    constructor(
        /**
         * The readonly value of this Constant.
         */
        private readonly _value: V | typeof unresolved,
    ) {
        super();
    }

    [getValueOrUnresolved]() { return this._value; }

    readonly version!: 0;
    readonly settable!: false;
}
Object.defineProperties(Constant.prototype, {
    version: { value: 0 },
    settable: { value: false },
});
