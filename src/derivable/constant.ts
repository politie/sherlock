import { BaseDerivable } from './base-derivable';
import { Derivable } from './derivable.interface';
import { deriveMethod } from './derivation';
import {
    andMethod, AndMethod, DeriveMethod, isMethod, IsMethod, notMethod, NotMethod, orMethod, OrMethod, PluckMethod, pluckMethod
} from './mixins';

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
        readonly value: V,
    ) {
        super();
    }

    /**
     * Returns the value of this Constant.
     */
    get(): V { return this.value; }

    readonly version!: 0;
    readonly settable!: false;

    readonly derive!: DeriveMethod<V>;
    readonly pluck!: PluckMethod<V>;

    readonly and!: AndMethod<V>;
    readonly or!: OrMethod<V>;
    readonly not!: NotMethod;
    readonly is!: IsMethod;
}
Object.defineProperties(Constant.prototype, {
    version: { value: 0 },
    settable: { value: false },

    derive: { value: deriveMethod },
    pluck: { value: pluckMethod },

    and: { value: andMethod },
    or: { value: orMethod },
    not: { value: notMethod },
    is: { value: isMethod },
});
