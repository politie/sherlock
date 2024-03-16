import { autoCacheMode, connect, dependencies, dependencyVersions, disconnect, finalize, mark, observers } from '../symbols';
import {
    isRecordingObservations, Observer, recordObservation, startRecordingObservations, stopRecordingObservations, TrackedObservable, TrackedObserver
} from './tracking';

describe('tracking/tracking', () => {
    it('should throw when trying to stop recording when no recording is active', () => {
        expect(() => stopRecordingObservations()).toThrowError();
    });

    describe('(recording observations)', () => {
        let observer: TrackedObserver;
        let observables: Array<TrackedObservable & Observer>;
        beforeEach(() => {
            observer = {
                id: 0,
                [dependencies]: [],
                [dependencyVersions]: {},
                [mark]: jest.fn(),
            };
        });
        beforeEach(() => {
            observables = [1, 2, 3].map(id => ({
                id,
                version: 1,
                [observers]: [],
                [autoCacheMode]: false,
                connected: true,
                [connect]: jest.fn(),
                [disconnect]: jest.fn(),
                [mark]: jest.fn(),
                finalized: false,
                [finalize]: jest.fn(),
            }));
        });

        afterEach(() => { expect(isRecordingObservations()).toBe(false); });

        it('should report that we are in a recording', () => {
            expect(isRecordingObservations()).toBe(false);
            startRecordingObservations(observer);
            expect(isRecordingObservations()).toBe(true);
            stopRecordingObservations();
            expect(isRecordingObservations()).toBe(false);
        });

        describe('after one recording', () => {
            beforeEach(() => {
                startRecordingObservations(observer);
                observables.forEach(obs => recordObservation(obs, false));
                stopRecordingObservations();
            });

            it('should have recorded all dependencies', () => {
                expect(observer[dependencies]).toEqual(observables);
                expect(observer[dependencyVersions]).toEqual({ 1: 1, 2: 1, 3: 1 });
                observables.forEach(obs => expect(obs[observers]).toEqual([observer]));
            });

            describe('and a second recording', () => {
                beforeEach(() => {
                    startRecordingObservations(observer);
                    recordObservation(observables[1], false);
                    recordObservation(observables[0], false);
                    // Observables should be recorded only once in the dependencies array...
                    recordObservation(observables[1], false);
                    stopRecordingObservations();
                });

                it('should have updated the dependencies in the order in which they were observed', () => {
                    expect(observer[dependencies]).toEqual([
                        observables[1], observables[0],
                    ]);
                    expect(observables[2][observers]).toHaveLength(0);
                    observables.slice(0, 2).forEach(obs =>
                        expect(obs[observers]).toEqual([observer]),
                    );
                });

                it('should have called disconnect on disconnectable dependencies that are no longer needed', () => {
                    expect(observables[0][disconnect]).not.toHaveBeenCalled();
                    expect(observables[1][disconnect]).not.toHaveBeenCalled();
                    expect(observables[2][disconnect]).toHaveBeenCalledTimes(1);
                });
            });
        });

        it('should support nested recordings', () => {
            const secondObserver: TrackedObserver = {
                id: 4,
                [dependencies]: [],
                [dependencyVersions]: {},
                [mark]: jest.fn(),
            };

            startRecordingObservations(observer);

            startRecordingObservations(secondObserver);
            recordObservation(observables[1], false);
            recordObservation(observables[2], false);
            stopRecordingObservations();

            expect(observer[dependencies]).toHaveLength(0);
            expect(secondObserver[dependencies]).toEqual(observables.slice(1));
            expect(observables[0][observers]).toHaveLength(0);
            expect(observables[1][observers]).toEqual([secondObserver]);
            expect(observables[2][observers]).toEqual([secondObserver]);

            recordObservation(observables[0], false);
            recordObservation(observables[1], false);

            stopRecordingObservations();

            expect(observer[dependencies]).toEqual(observables.slice(0, 2));
            expect(secondObserver[dependencies]).toEqual(observables.slice(1));
            expect(observables[0][observers]).toEqual([observer]);
            expect(observables[1][observers]).toEqual([secondObserver, observer]);
            expect(observables[2][observers]).toEqual([secondObserver]);
        });

        it('should fail when trying to record a cyclic dependency of derivables', () => {
            const secondObserver: TrackedObserver = {
                id: 4,
                [dependencies]: [],
                [dependencyVersions]: {},
                [mark]: jest.fn(),
            };
            startRecordingObservations(observer);
            startRecordingObservations(secondObserver);
            expect(() => startRecordingObservations(observer)).toThrowError('cyclic dependency between derivables detected');
            stopRecordingObservations();
            stopRecordingObservations();
        });
    });
});
