import { Derivable, SettableDerivable, State } from '../interfaces';
import { autoCacheMode, connect, disconnect, internalGetState, observers } from '../symbols';
import { independentTracking, isRecordingObservations, maybeDisconnectInNextTick, TrackedObservable, TrackedObserver } from '../tracking';
import { prepareCreationStack, uniqueId } from '../utils';

/**
 * The base class for all Derivables. Derivables must extend from this, to be 'tracked' and to classify as a Derivable.
 * This has to be a class in order for other parts of the library (e.g. reactor.ts) to be able to extend all Derivables.
 * So this acts as the base prototype of all Derivables.
 *
 * When extending the prototype of the BaseDerivable, don't forget to also extend the ExtendDerivable interface.
 */
export abstract class BaseDerivable<V> implements TrackedObservable, Derivable<V> {
    /**
     * The unique ID of this Derivable. Can be used to uniquely identify this Derivable.
     */
    readonly id = uniqueId();

    /**
     * Used for debugging. A stack that shows the location where this derivation was created.
     */
    readonly creationStack = prepareCreationStack(this);

    /**
     * The observers of this Derivable, do not use this in application code.
     */
    readonly [observers]: TrackedObserver[] = [];

    [autoCacheMode] = false;

    /**
     * Sets this Derivable to autoCache mode. This will cache the state of this Derivable the first time {@link #get} is called every tick
     * and release this cache some time after this tick. The state is still guaranteed to be up-to-date with respect to changes in any of
     * its dependencies, by using the same mechanism that is used by a reactor. It has a setup cost comparable to starting a reactor every
     * first time #get is called per tick. Starting a reactor on a Derivable with an active and up-to-date cache is cheap though.
     */
    autoCache() {
        this[autoCacheMode] = true;
        return this;
    }

    getState() {
        // Should we connect now?
        if (!this.connected) {
            if (this[autoCacheMode]) {
                // We will connect because of autoCacheMode, after a tick we may need to disconnect (if no reactor was started
                // in this tick).
                this[connect]();
                maybeDisconnectInNextTick(this);
            } else if (isRecordingObservations()) {
                // We know we need to connect if isRecordingObservations() returns true (in which case our observer is connecting/connected
                // and therefore recording its dependencies).
                this[connect]();
            }
        }

        return this[internalGetState]();
    }

    abstract [internalGetState](): State<V>;

    /**
     * The current version of the state. This number gets incremented every time the state changes. Setting the state to
     * an immutable object that is structurally equal to the previous immutable object is not considered a state change.
     */
    abstract readonly version: number;

    connected = false;
    /** @internal */
    _connected$?: SettableDerivable<boolean> = undefined;
    [connect]() { setConnectionStatus(this, true); }
    [disconnect]() { setConnectionStatus(this, false); }
}

function setConnectionStatus(bs: BaseDerivable<any>, status: boolean) {
    bs.connected = status;
    bs._connected$ && independentTracking(() => bs._connected$!.set(status));
}
