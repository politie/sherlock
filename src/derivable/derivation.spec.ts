import { expect } from 'chai';
import { SinonFakeTimers, SinonSpy, SinonStub, spy, stub, useFakeTimers } from 'sinon';
import { setDebugMode } from '../utils';
import { Atom } from './atom';
import { atom } from './atom';
import { Derivable } from './derivable';
import { testDerivable } from './derivable.spec';
import { derivation } from './derivation';

describe('derivable/derivation', () => {
    testDerivable(<V>(v: V) => derivation(() => v));

    it('should not generate a stacktrace on instantiation', () => {
        // tslint:disable-next-line:no-string-literal
        expect(derivation(() => 0)['stack']).to.be.undefined;
    });

    context('in debug mode', () => {
        before('setDebugMode', () => setDebugMode(true));
        after('resetDebugMode', () => setDebugMode(false));

        let consoleErrorStub: SinonStub;
        beforeEach('stub console.error', () => { consoleErrorStub = stub(console, 'error'); });
        afterEach('restore console.error', () => { consoleErrorStub.restore(); });

        it('should generate a stacktrace on instantiation', () => {
            // tslint:disable-next-line:no-string-literal
            expect(derivation(() => 0)['stack']).to.be.a('string');
        });

        it('should log the recorded stacktrace on error', () => {
            const d$ = derivation(() => { throw new Error('the Error'); });
            // tslint:disable-next-line:no-string-literal
            const stack = d$['stack'];
            expect(() => d$.get()).to.throw('the Error');
            expect(console.error).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('the Error', stack);
        });
    });

    it('should not call the deriver when the cached value is known to be up to date because of a reactor', () => {
        const deriver = spy(() => 123);
        const d$ = derivation(deriver);
        d$.get();
        expect(deriver).to.have.been.calledOnce;
        d$.react(() => 0);
        expect(deriver).to.have.been.calledTwice;
        d$.get();
        expect(deriver).to.have.been.calledTwice;
    });

    it('should cache thrown errors to rethrow them on multiple accesses until the derivation produces a new result', () => {
        const a$ = atom(false);
        const theError = new Error('the error');
        const deriver = spy((a: boolean) => { if (a) { throw theError; } else { return 'a value'; } });
        const d$ = a$.derive(deriver).autoCache();
        expect(d$.get(), 'first time').to.equal('a value');
        expect(d$.get(), 'second time').to.equal('a value');
        expect(deriver).to.have.been.calledOnce;
        a$.set(true);
        expect(() => d$.get(), 'first time').to.throw(theError);
        expect(() => d$.get(), 'second time').to.throw(theError);
        expect(deriver).to.have.been.calledTwice;
        a$.set(false);
        expect(d$.get(), 'first time').to.equal('a value');
        expect(d$.get(), 'second time').to.equal('a value');
        expect(deriver).to.have.been.calledThrice;
    });

    it('should allow error objects as valid values', () => {
        const theError = new Error('the error');
        const deriver = spy(() => theError);
        const d$ = derivation(deriver).autoCache();
        expect(d$.get(), 'first time').to.equal(theError);
        expect(d$.get(), 'second time').to.equal(theError);
        expect(deriver).to.have.been.calledOnce;
    });

    describe('#autoCache', () => {
        let clock: SinonFakeTimers;
        beforeEach('use fake timers', () => { clock = useFakeTimers(); });
        afterEach('restore timers', () => { clock.restore(); });

        let a$: Atom<string>;
        beforeEach('create the atom', () => { a$ = atom('value'); });

        let deriver: SinonSpy;
        beforeEach('create the deriver', () => { deriver = spy((v = 'empty') => v + '!'); });

        let d$: Derivable<string>;
        beforeEach('create the derivation', () => { d$ = a$.derive(deriver).autoCache(); });

        it('should automatically cache the value of the Derivable the first time in a tick', () => {
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;
            expect(d$.get()).to.equal('value!');
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;
        });

        it('should stop the cache after the tick', () => {
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;

            clock.tick(0);

            expect(deriver).to.have.been.calledOnce;
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledTwice;

            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledTwice;
        });

        it('should keep the value updated', () => {
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;

            a$.set('another value');
            expect(deriver).to.have.been.calledOnce;
            expect(d$.get()).to.equal('another value!');
            expect(deriver).to.have.been.calledTwice;
            expect(d$.get()).to.equal('another value!');
            expect(deriver).to.have.been.calledTwice;
        });

        it('should start a reactor without recalculation', () => {
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;

            const received: string[] = [];
            d$.react(received.push.bind(received));
            expect(received).to.deep.equal(['value!']);
            expect(deriver).to.have.been.calledOnce;

            a$.set('another value');
            expect(received).to.deep.equal(['value!', 'another value!']);
            expect(deriver).to.have.been.calledTwice;
        });

        it('should not interfere with reactor observation after a tick', () => {
            expect(d$.get()).to.equal('value!');

            const received: string[] = [];
            d$.react(received.push.bind(received));
            expect(received).to.deep.equal(['value!']);

            clock.tick(0);

            a$.set('another value');
            expect(received).to.deep.equal(['value!', 'another value!']);
        });

        it('should cache derivables until the next tick even when all existing observers disappear', () => {
            const stopReactor = d$.react(() => void 0);
            expect(deriver).to.have.been.calledOnce;

            // Value is already cached, so autoCacheMode has no effect now.
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;

            stopReactor();

            // Value should still be cached even when all reactors are stopped.
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledOnce;

            clock.tick(0);

            // Only after the tick, the cache may be released.
            expect(d$.get()).to.equal('value!');
            expect(deriver).to.have.been.calledTwice;
        });
    });
});
