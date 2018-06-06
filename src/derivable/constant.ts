import { BaseDerivable, Derivable } from './derivable';
import {
    and, BooleanAnd, BooleanIs, BooleanNot, BooleanOr, DerivablePluck,
    Derive, deriveMethod, is, not, or, pluck,
} from './mixins';

/**
 * Constant represents a basic immutable building block of derivations.
 */
export class Constant<V> extends BaseDerivable<V> implements Derivable<V> {
    /**
     * Constant is not settable
     */
    readonly settable = false;

    /**
     * Creates a new Constant with the give value.
     *
     * @param value the readonly value of this Constant
     */
    constructor(
        /**
         * @internal
         * The readonly value of this Constant.
         */
        readonly value: V,
    ) {
        super();
    }

    /**
     * @internal
     * The version of this Constant, should always stay at 0, because Constants never change.
     */
    readonly version = 0;

    /**
     * Returns the value of this Constant.
     */
    get(): V { return this.value; }

    derive!: Derive<V>;
    pluck!: DerivablePluck<V>;

    and!: BooleanAnd<V>;
    or!: BooleanOr<V>;
    not!: BooleanNot;
    is!: BooleanIs;
}
Constant.prototype.derive = deriveMethod;
Constant.prototype.pluck = pluck;

Constant.prototype.and = and;
Constant.prototype.or = or;
Constant.prototype.not = not;
Constant.prototype.is = is;
