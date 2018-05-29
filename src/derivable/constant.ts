import { MixinFn } from 'utils';
import { BaseDerivable, Derivable } from './derivable';
import {
    and, BooleanAnd, BooleanIs, BooleanNot, BooleanOr, DerivablePluck,
    derive, Derive, is, not, or, pluck,
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

    @MixinFn(derive) derive!: Derive<V>;
    @MixinFn(pluck) pluck!: DerivablePluck<V>;

    @MixinFn(and) and!: BooleanAnd<V>;
    @MixinFn(or) or!: BooleanOr<V>;
    @MixinFn(not) not!: BooleanNot;
    @MixinFn(is) is!: BooleanIs;
}
