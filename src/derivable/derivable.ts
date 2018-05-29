import { AutoCacheable, TrackedObservable, TrackedObserver } from '../tracking';
import { uniqueId } from '../utils';
import {
    AtomPluckable, BooleanDerivable, CanDerive, DerivablePluckable, Gettable, Lensable, Settable, Swappable,
} from './mixins/interfaces';

export abstract class BaseDerivable<V> implements TrackedObservable, AutoCacheable {

    /**
     * The unique ID of this Derivable. Can be used to uniquely identify this Derivable.
     */
    readonly id = uniqueId();

    /**
     * @internal
     * The observers of this Derivable, do not use this in application code.
     */
    readonly observers: TrackedObserver[] = [];

    /**
     * Sets this Derivable to autoCache mode. This will cache the value of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The value is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache() { return this; }

    /**
     * @internal
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    abstract version: number;
}

/**
 * Atom is the basic state holder in a Derivable world. It contains the actual mutable state. In contrast
 * with other kinds of derivables that only store immutable (constant) or derived state. Should be constructed
 * with the initial state.
 */
export type SettableDerivable<V> =
    BaseDerivable<V> &
    CanDerive<V> &
    BooleanDerivable<V> &
    AtomPluckable<V> &
    Lensable<V> &
    Swappable<V> &
    Settable<V>;

export type Derivable<V> =
    BaseDerivable<V> &
    CanDerive<V> &
    Gettable<V> &
    BooleanDerivable<V> &
    DerivablePluckable<V>;
