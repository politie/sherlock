import { Derivable } from '../derivable';

export type BooleanAnd<V> = <W>(this: Derivable<V>, other: Derivable<W> | W) => Derivable<V | W>;
export type BooleanOr<V> = <W>(this: Derivable<V>, other: Derivable<W> | W) => Derivable<V | W>;
export type BooleanNot = (this: Derivable<any>) => Derivable<boolean>;
export type BooleanIs = (this: Derivable<any>, other: Derivable<any> | any) => Derivable<boolean>;

export interface BooleanDerivable<V> {
    /**
     * Combine this derivable with another derivable or value using the `&&` operator on the values. Returns another Derivable.
     */
    and: BooleanAnd<V>;

    /**
     * Combine this derivable with another derivable or value using the `||` operator on the values. Returns another Derivable.
     */
    or: BooleanOr<V>;

    /**
     * Create a derivation of this Derivable using the `!` operator on the value.
     */
    not: BooleanNot;

    /**
     * Compares the value of this derivable to the given value or the value of the given derivable using the same `equals` rules
     * that are used for determining state changes.
     */
    is: BooleanIs;
}
