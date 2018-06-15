import { BaseDerivable } from './base-derivable';
import { deriveMethod } from './derivation';
import { Derivable } from './interfaces';
import { andMethod, isMethod, notMethod, orMethod, pluckMethod } from './mixins';

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

    readonly derive!: Derivable<V>['derive'];
    readonly pluck!: Derivable<V>['pluck'];

    readonly and!: Derivable<V>['and'];
    readonly or!: Derivable<V>['or'];
    readonly not!: Derivable<V>['not'];
    readonly is!: Derivable<V>['is'];
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
