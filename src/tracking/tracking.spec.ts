import { expect } from 'chai';
import { spy } from 'sinon';
import {
    isRecordingObservations, Observer, recordObservation, startRecordingObservations, stopRecordingObservations, TrackedObservable, TrackedObserver
} from './tracking';

describe('tracking/tracking', () => {
    it('should throw when trying to stop recording when no recording is active', () => {
        expect(() => stopRecordingObservations()).to.throw();
    });

    describe('(recording observations)', () => {
        let observer: TrackedObserver;
        let observables: Array<TrackedObservable & Observer>;
        beforeEach('create an observer', () => {
            observer = {
                id: 0,
                dependencies: [],
                dependencyVersions: {},
                disconnect: spy(),
                mark: spy(),
            };
        });
        beforeEach('create an observable', () => {
            observables = [1, 2, 3].map(id => ({
                id,
                version: 1,
                observers: [],
                disconnect: spy(),
                mark: spy(),
            }));
        });

        afterEach('check no remaining recordings', () => { expect(isRecordingObservations()).to.be.false; });

        it('should report that we are in a recording', () => {
            expect(isRecordingObservations()).to.be.false;
            startRecordingObservations(observer);
            expect(isRecordingObservations()).to.be.true;
            stopRecordingObservations();
            expect(isRecordingObservations()).to.be.false;
        });

        context('after one recording', () => {
            beforeEach('record all observables', () => {
                startRecordingObservations(observer);
                observables.forEach(recordObservation);
                stopRecordingObservations();
            });

            it('should have recorded all dependencies', () => {
                expect(observer.dependencies).to.deep.equal(observables);
                expect(observer.dependencyVersions).to.deep.equal({ 1: 1, 2: 1, 3: 1 });
                observables.forEach(obs => expect(obs.observers).to.deep.equal([observer]));
            });

            context('and a second recording', () => {
                beforeEach('record a different subset of observables', () => {
                    startRecordingObservations(observer);
                    recordObservation(observables[1]);
                    recordObservation(observables[0]);
                    // Observables should be recorded only once in the dependencies array...
                    recordObservation(observables[1]);
                    stopRecordingObservations();
                });

                it('should have updated the dependencies in the order in which they were observed', () => {
                    expect(observer.dependencies).to.deep.equal([
                        observables[1], observables[0],
                    ]);
                    expect(observables[2].observers).to.be.empty;
                    observables.slice(0, 2).forEach(obs =>
                        expect(obs.observers).to.deep.equal([observer]),
                    );
                });

                it('should have called disconnect on disconnectable dependencies that are no longer needed', () => {
                    expect(observables[0].disconnect).to.not.have.been.called;
                    expect(observables[1].disconnect).to.not.have.been.called;
                    expect(observables[2].disconnect).to.have.been.calledOnce;
                });
            });
        });

        it('should support nested recordings', () => {
            const secondObserver: TrackedObserver = {
                id: 4,
                dependencies: [],
                dependencyVersions: {},
                disconnect: spy(),
                mark: spy(),
            };

            startRecordingObservations(observer);

            startRecordingObservations(secondObserver);
            recordObservation(observables[1]);
            recordObservation(observables[2]);
            stopRecordingObservations();

            expect(observer.dependencies).to.be.empty;
            expect(secondObserver.dependencies).to.deep.equal(observables.slice(1));
            expect(observables[0].observers).to.be.empty;
            expect(observables[1].observers).to.deep.equal([secondObserver]);
            expect(observables[2].observers).to.deep.equal([secondObserver]);

            recordObservation(observables[0]);
            recordObservation(observables[1]);

            stopRecordingObservations();

            expect(observer.dependencies).to.deep.equal(observables.slice(0, 2));
            expect(secondObserver.dependencies).to.deep.equal(observables.slice(1));
            expect(observables[0].observers).to.deep.equal([observer]);
            expect(observables[1].observers).to.deep.equal([secondObserver, observer]);
            expect(observables[2].observers).to.deep.equal([secondObserver]);
        });

        it('should fail when trying to record a cyclic dependency of derivables', () => {
            const secondObserver: TrackedObserver = {
                id: 4,
                dependencies: [],
                dependencyVersions: {},
                disconnect: spy(),
                mark: spy(),
            };
            startRecordingObservations(observer);
            startRecordingObservations(secondObserver);
            expect(() => startRecordingObservations(observer)).to.throw('cyclic dependency between derivables detected');
            stopRecordingObservations();
            stopRecordingObservations();
        });
    });
});
