import { autoCacheMode, connect, dependencies, dependencyVersions, disconnect, finalize, mark, observers } from '../symbols';
import { markFinalInTransaction } from '../transaction';
import { augmentStack } from '../utils';

let currentRecording: Recording | undefined;

/**
 * Will record all dependencies that were touched until {@link stopRecordingObservations} is called. Changes
 * {@link TrackedObserver#dependencies} during the recording, so both the number of element and the order of elements
 * cannot be relied upon.
 *
 * Recordings can be nested, this recording will replace the current recording if applicable. After stopping this recording
 * the previous recording will become active again.
 *
 * @param observer the observer that is interested in its dependencies
 */
export function startRecordingObservations(observer: TrackedObserver) {
    // Check for cyclic observer dependencies (which is only possible when using impure functions in Derivables)
    // we do not support that.
    let r = currentRecording;
    while (r) {
        if (r._observer === observer) {
            throw augmentStack(new Error('cyclic dependency between derivables detected'), observer);
        }
        r = r._previousRecording;
    }
    currentRecording = { _observer: observer, _confirmed: 0, _previousRecording: currentRecording, _finalObservables: {} };
}

/**
 * Stops the current recording and returns to the previous recording if applicable. Will remove any dependency from the
 * {@link TrackedObserver#dependencies} array that was not touched since the call to {@link startRecordingObservations}.
 * It will also update {@link TrackedObserver#dependencyVersions} and call disconnect on any dependency that can be disconnected
 * if it is not observed anymore.
 */
export function stopRecordingObservations() {
    const recording = currentRecording;
    if (!recording) {
        throw new Error('No active recording!');
    }
    currentRecording = recording._previousRecording;
    const { _confirmed, _observer, _finalObservables } = recording;
    const deps = _observer[dependencies];
    const depVersions = _observer[dependencyVersions];

    // Any previous dependency that was not confirmed during the recording can be removed now.
    for (let i = _confirmed, n = deps.length; i < n; i++) {
        removeObserver(deps[i], _observer);
    }
    deps.length = _confirmed;

    for (const dep of deps) {
        depVersions[dep.id] = dep.version;
    }

    Object.values(_finalObservables).forEach(markFinalInTransaction);
}

/**
 * Returns true iff we are currently recording dependencies.
 */
export function isRecordingObservations() {
    return !!currentRecording;
}

export function allDependenciesAreFinal() {
    if (!currentRecording) {
        return false;
    }
    const { _confirmed, _finalObservables, _observer } = currentRecording;
    const deps = _observer[dependencies];
    for (let i = 0; i < _confirmed; i++) {
        if (!(deps[i].id in _finalObservables)) {
            return false;
        }
    }
    return true;
}

export function independentTracking<V>(fn: () => V): V {
    const oldRecording = currentRecording;
    currentRecording = undefined;
    try {
        return fn();
    } finally {
        currentRecording = oldRecording;
    }
}

export function markFinal(observable: TrackedObservable) {
    if (currentRecording) {
        currentRecording._finalObservables[observable.id] = observable;
    } else {
        markFinalInTransaction(observable);
    }
}

/**
 * Records in the current recording (if applicable) that the given `dependency` was observed.
 *
 * @param dependency the observable that is being observed
 */
export function recordObservation(dependency: TrackedObservable, finalValue: boolean) {
    if (!currentRecording || dependency.finalized) {
        // Not currently recording observations, nevermind...
        return;
    }

    if (finalValue) {
        currentRecording._finalObservables[dependency.id] = dependency;
    }

    const { _observer } = currentRecording;
    const deps = _observer[dependencies];
    // Invariants:
    // - dependencies[0..currentRecording.confirmed) have been recorded (confirmed) as dependencies
    // - dependencies[currentRecording.confirmed..n) have not yet been recorded (confirmed)
    if (deps[currentRecording._confirmed] === dependency) {
        // This is the expected branch almost everytime we rerecord a derivation. The dependencies are often encountered in the
        // same order as before. So we found our dependency at dependencies[currentRecording.confirmed]. We can keep our invariant and
        // include our latest observation by incrementing the confirmed counter. Our observer is already registered at this
        // dependency because of last time.
        currentRecording._confirmed++;

    } else {
        // This branch means this is either the first recording, this dependency is new, or the dependencies are out of order
        // compared to last time.
        const index = deps.indexOf(dependency);
        if (index < 0) {
            // dependency not yet present in dependencies array. This means we have to register the observer at
            // the dependency and add the dependency to the observer (both ways).
            addObserver(dependency, _observer);
            if (currentRecording._confirmed === deps.length) {
                // We don't have to reorder dependencies, because it is empty to the right of currentRecording.confirmed.
                deps.push(dependency);
            } else {
                // Simple way to keep the invariant, move the current item to the end and
                // insert the new dependency in the current position.
                deps.push(deps[currentRecording._confirmed]);
                deps[currentRecording._confirmed] = dependency;
            }
            // dependencies[0..currentRecording.confirmed) are dependencies and dependencies[currentRecording.confirmed] is a dependency
            currentRecording._confirmed++;
            // dependencies[0..currentRecording.confirmed) are dependencies

        } else if (index > currentRecording._confirmed) {
            // dependency is present in dependencies, but we were not expecting it yet, swap places
            deps[index] = deps[currentRecording._confirmed];
            deps[currentRecording._confirmed] = dependency;
            currentRecording._confirmed++;
        }
        // else: index >= 0 && index < currentRecording.confirmed, i.e. already seen before and already confirmed. Do nothing.
    }
    // Postcondition:
    // - dependency in dependencies[0..currentRecording.confirmed)
}

export interface Observable {
    readonly id: number;
    version: number;
}

export interface Finalizer {
    [finalize](): void;
    finalized: boolean;
}

export interface TrackedObservable extends Observable, Finalizer {
    connected: boolean;
    [connect](): void;
    [disconnect](): void;
    [autoCacheMode]: boolean;
    readonly [observers]: Observer[];
}

export interface Observer {
    [disconnect](): void;
    [mark](reactorSink: TrackedReactor[]): void;
}

export interface TrackedObserver extends Observer {
    readonly id: number;
    readonly creationStack?: string;
    readonly [dependencies]: TrackedObservable[];
    readonly [dependencyVersions]: { [id: number]: number };
}

export interface TrackedReactor {
    /** @internal */
    _reactIfNeeded(): void;
}

/**
 * Registers a single observer on an observable. The observer must not already be registered on this observable. If this
 * observer is the first and the observable can be connected it will be connected.
 *
 * @param observable the observable on which to register the observer
 * @param observer the observer that should be registered
 */
export function addObserver(observable: TrackedObservable, observer: Observer) {
    const obs = observable[observers];
    obs.push(observer);
    if (obs.length === 1 && !observable.connected) {
        observable[connect]();
    }
}

/**
 * Removes a single observer from the registered observers of the observable. Will error if the observer is not known.
 * If the observable has no observers left and can be disconnected it will be disconnected.
 *
 * @param observable the observable from which to remove the registered observer
 * @param observer the observer that has to be removed
 */
export function removeObserver(observable: TrackedObservable, observer: Observer) {
    const obs = observable[observers];
    const i = obs.indexOf(observer);
    // istanbul ignore if: should never happen!
    if (i < 0) {
        throw new Error('Inconsistent state!');
    }
    obs.splice(i, 1);
    // If the dependency is itself another observer and is not observed anymore, we should disconnect it.
    if (obs.length === 0 && observable.connected) {
        // Disconnect this observable when not in autoCache mode.
        // When in autoCache mode, it will wait a tick and then disconnect when no observers are listening.
        if (observable[autoCacheMode]) {
            maybeDisconnectInNextTick(observable);
        } else {
            observable[disconnect]();
        }
    }
}

let evaluateInNextTick: TrackedObservable[] | undefined;

export function maybeDisconnectInNextTick(observable: TrackedObservable) {
    if (evaluateInNextTick) {
        evaluateInNextTick.push(observable);
    } else {
        evaluateInNextTick = [observable];
        setTimeout(() => {
            const evaluateNow = evaluateInNextTick!;
            evaluateInNextTick = undefined;
            evaluateNow.forEach(obs => obs.connected && obs[observers].length === 0 && obs[disconnect]());
        }, 0);
    }
}

interface Recording {
    /**
     * The observer that is interested in its dependencies.
     * @internal
     */
    _observer: TrackedObserver;
    /**
     * The slice of observer.dependencies that is confirmed (again) as an actual dependency.
     * @internal
     */
    _confirmed: number;
    /**
     * Observables that should be disconnected after the recording.
     */
    _finalObservables: Record<string, TrackedObservable>;
    /**
     * The recording to return to after this recording ends, if applicable.
     * @internal
     */
    _previousRecording: Recording | undefined;
}
