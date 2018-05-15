import { TrackedObservable, TrackedObserver } from '../tracking';
import { uniqueId } from '../utils';

/**
 * Derivable is the base class of all derivable state constructs: Atom, Constant, Derivation and Lens.
 */
export abstract class Derivable<V> implements TrackedObservable {
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
     * @internal
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    abstract version: number;

    /**
     * Returns the current value of this derivable. Automatically records the use of this derivable when inside a derivation.
     */
    abstract get(): V;

    /**
     * JavaScript getter access to the `#get` method
     */
    get value() { return this.get(); }

    /**
     * Sets this Derivable to autoCache mode. This will cache the value of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The value is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache() { return this; }
}
