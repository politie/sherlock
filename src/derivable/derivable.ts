import { BaseTrackedObservable } from 'tracking/tracked-observable';
import {
    AtomPluckable, BooleanDerivable, CanDerive, DerivablePluckable, Gettable, Lensable, Settable, Swappable,
} from './mixins/interfaces';

/**
 * Atom is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export type SettableDerivable<V> =
    BaseTrackedObservable &
    CanDerive<V> &
    BooleanDerivable<V> &
    AtomPluckable<V> &
    Lensable<V> &
    Swappable<V> &
    Settable<V>;

export type Derivable<V> =
    BaseTrackedObservable &
    CanDerive<V> &
    Gettable<V> &
    BooleanDerivable<V> &
    DerivablePluckable<V>;
