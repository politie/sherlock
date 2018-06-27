import { expect } from 'chai';
import { fromPromise } from './from-promise';

describe('sherlock-utils/fromPromise', () => {
    it('should expose the result of the promise on the returned derivable', async () => {
        const promise = Promise.resolve(123);
        const p$ = fromPromise(promise);
        expect(p$.resolved).to.be.false;
        await promise;
        expect(p$.get()).to.equal(123);
    });

    it('should refresh all derivations that depend on the returned derivable', async () => {
        const promise = Promise.resolve(15);
        const p$ = fromPromise(promise);
        const d$ = p$.derive(v => v + 27);
        expect(d$.resolved).to.be.false;

        await promise;
        expect(d$.get()).to.equal(42);
    });

    it('should expose an already resolved promise on the returned derivable', async () => {
        const promise = Promise.resolve(123);
        await promise;
        const p$ = fromPromise(promise);

        // Wait one tick
        await Promise.resolve();

        expect(p$.get()).to.equal(123);
    });

    it('should handle promise rejection', async () => {
        const promise = Promise.reject('abc');
        const p1$ = fromPromise(promise);
        await promise.catch(() => void 0);
        const p2$ = fromPromise(promise);

        expect(p1$.errored).to.be.true;
        expect(p1$.error).to.equal('abc');

        // Wait one tick
        await Promise.resolve();

        expect(p2$.errored).to.be.true;
        expect(p2$.error).to.equal('abc');
    });
});
