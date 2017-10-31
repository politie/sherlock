import { BaseError, Logger } from '@politie/informant';

const logger = Logger.get('@politie/sherlock.tracking');

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
        if (r.observer === observer) {
            throw new BaseError({ observer: observer.id }, 'cyclic dependency between derivables detected');
        }
        r = r.previousRecording;
    }
    logger.trace({ observer: observer.id }, 'start recording');
    currentRecording = { observer, confirmed: 0, previousRecording: currentRecording };
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
    currentRecording = recording.previousRecording;
    const { confirmed, observer } = recording;
    const { id, dependencies, dependencyVersions } = observer;

    logger.trace({ observer: id, recorded: confirmed, removed: dependencies.length - confirmed }, 'stop recording');

    // Any previous dependency that was not confirmed during the recording can be removed now.
    for (let i = confirmed, n = dependencies.length; i < n; i++) {
        removeObserver(dependencies[i], observer);
    }
    dependencies.length = confirmed;

    for (const dep of dependencies) {
        dependencyVersions[dep.id] = dep.version;
    }
}

/**
 * Returns true iff we are currently recording dependencies.
 */
export function isRecordingObservations() {
    return !!currentRecording;
}

/**
 * Records in the current recording (if applicable) that the given `dependency` was observed.
 *
 * @param dependency the observable that is being observed
 */
export function recordObservation(dependency: TrackedObservable) {
    if (!currentRecording) {
        // Not currently recording observations, nevermind...
        return;
    }

    const { observer } = currentRecording;
    const { dependencies } = observer;
    // Invariants:
    // - dependencies[0..currentRecording.confirmed) have been recorded (confirmed) as dependencies
    // - dependencies[currentRecording.confirmed..n) have not yet been recorded (confirmed)
    if (dependencies[currentRecording.confirmed] === dependency) {
        // This is the expected branch almost everytime we rerecord a derivation. The dependencies are often encountered in the
        // same order as before. So we found our dependency at dependencies[currentRecording.confirmed]. We can keep our invariant and
        // include our latest observation by incrementing the confirmed counter. Our observer is already registered at this
        // dependency because of last time.
        currentRecording.confirmed++;

        logger.trace({ observer: observer.id, dependency: dependency.id }, 'dependency confirmed');

    } else {
        // This branch means this is either the first recording, this dependency is new, or the dependencies are out of order
        // compared to last time.
        const index = dependencies.indexOf(dependency);
        if (index < 0) {
            // dependency not yet present in dependencies array. This means we have to register the observer at
            // the dependency and add the dependency to the observer (both ways).
            dependency.observers.push(observer);
            if (currentRecording.confirmed === dependencies.length) {
                // We don't have to reorder dependencies, because it is empty to the right of currentRecording.confirmed.
                dependencies.push(dependency);
            } else {
                // Simple way to keep the invariant, move the current item to the end and
                // insert the new dependency in the current position.
                dependencies.push(dependencies[currentRecording.confirmed]);
                dependencies[currentRecording.confirmed] = dependency;
            }
            // dependencies[0..currentRecording.confirmed) are dependencies and dependencies[currentRecording.confirmed] is a dependency
            currentRecording.confirmed++;
            // dependencies[0..currentRecording.confirmed) are dependencies

            logger.trace({ observer: observer.id, dependency: dependency.id }, 'new dependency found');

        } else if (index > currentRecording.confirmed) {
            // dependency is present in dependencies, but we were not expecting it yet, swap places
            dependencies[index] = dependencies[currentRecording.confirmed];
            dependencies[currentRecording.confirmed] = dependency;
            currentRecording.confirmed++;

            logger.trace({ observer: observer.id, dependency: dependency.id }, 'dependency confirmed out of order');
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

export interface TrackedObservable extends Observable {
    readonly observers: Observer[];
}

export interface Observer {
    disconnect(): void;
    mark(reactorSink: Reactor[]): void;
}

export interface TrackedObserver extends Observer {
    readonly id: number;
    readonly dependencies: TrackedObservable[];
    readonly dependencyVersions: { [id: number]: number };
}

export interface Reactor {
    reactIfNeeded(): void;
}

/**
 * Removes a single observer from the registered observers of the observable. Will error if the observer is not known.
 * If the observable has no observers left and can be disconnected it will be disconnected.
 *
 * @param observable the observable from which to remove the registered observer
 * @param observer the observer that has to be removed
 */
export function removeObserver(observable: TrackedObservable, observer: Observer) {
    const { observers } = observable;
    const i = observers.indexOf(observer);
    // istanbul ignore if: should never happen!
    if (i < 0) {
        throw new Error('Inconsistent state!');
    }
    observers.splice(i, 1);
    // If the dependency is itself another observer and is not observed anymore, we should disconnect it.
    if (observers.length === 0 && canBeDisconnected(observable)) {
        observable.disconnect();
    }
}

function canBeDisconnected(obj: any): obj is { disconnect(): void; } {
    return obj && typeof obj.disconnect === 'function';
}

interface Recording {
    /** The observer that is interested in its dependencies. */
    observer: TrackedObserver;
    /** The slice of observer.dependencies that is confirmed (again) as an actual dependency. */
    confirmed: number;
    /** The recording to return to after this recording ends, if applicable. */
    previousRecording: Recording | undefined;
}
