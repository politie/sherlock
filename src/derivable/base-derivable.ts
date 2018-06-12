import { TrackedObservable, TrackedObserver } from '../tracking';
import { uniqueId } from '../utils/unique-id';
import { AutoCacheable } from './derivable.interface';

/**
 * The base class for all Derivables. Derivables must extend from this, to be 'tracked' and to classify as a Derivable.
 * This has to be a class in order for other parts of the library (e.g. reactor.ts) to be able to extend all Derivables.
 * So this acts as the base prototype of all Derivables.
 *
 * When extending the prototype of the BaseDerivable, don't forget to also extend the ExtendDerivable interface.
 */
export abstract class BaseDerivable<V> implements TrackedObservable, AutoCacheable {
    /**
     * The unique ID of this Derivable. Can be used to uniquely identify this Derivable.
     */
    readonly id = uniqueId();

    /**
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
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    abstract version: number;
}
