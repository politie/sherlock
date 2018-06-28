import { expect } from 'chai';
import { SinonStub, spy, stub } from 'sinon';
import { unresolved } from '../symbols';
import { config, ErrorWrapper } from '../utils';
import { Atom } from './atom';
import { $, testDerivable } from './base-derivable.spec';
import { Constant } from './constant';
import { testAutocache } from './derivation.spec';
import { atom, constant } from './factories';

describe('derivable/map', () => {
    context('(based on atom)', () => {
        testDerivable(v => new Atom(v).map(d => d), true);
        testDerivable(v => new Atom(v).map(d => d, d => d), true);
    });

    context('(based on constant)', () => {
        testDerivable(v => new Constant(v).map(d => d), true);
    });

    context('(bi-mapping)', () => {
        testDerivable(v => (new Atom(v === unresolved || v instanceof ErrorWrapper ? v : { value: v })).map(
            obj => obj.value,
            value => ({ value }),
        ), true);

        describe('#set', () => {
            it('should change the current state (and version) of the parent atom', () => {
                const a$ = $(atom('a'));
                const lensed$ = a$.map(v => v, v => v);
                expect(lensed$.get()).to.equal('a');
                expect(a$.version).to.equal(0);

                lensed$.set('b');
                expect(lensed$.get()).to.equal('b');
                expect(a$.version).to.equal(1);
            });

            it('should not update the version if the new value equals the previous value', () => {
                const a$ = $(atom('a'));
                const lensed$ = a$.map(v => v, v => v);
                expect(lensed$.get()).to.equal('a');
                expect(a$.version).to.equal(0);
                lensed$.set('a');
                expect(lensed$.get()).to.equal('a');
                expect(a$.version).to.equal(0);
            });
        });
    });

    testAutocache((a$, deriver) => a$.map(deriver));

    it('should not generate a stacktrace on instantiation', () => {
        // tslint:disable-next-line:no-string-literal
        expect(constant(0).map(() => 0)['stack']).to.be.undefined;
    });

    context('in debug mode', () => {
        before('setDebugMode', () => { config.debugMode = true; });
        after('resetDebugMode', () => { config.debugMode = false; });

        let consoleErrorStub: SinonStub;
        beforeEach('stub console.error', () => { consoleErrorStub = stub(console, 'error'); });
        afterEach('restore console.error', () => { consoleErrorStub.restore(); });

        it('should generate a stacktrace on instantiation', () => {
            // tslint:disable-next-line:no-string-literal
            expect(constant(0).map(() => 0)['stack']).to.be.a('string');
        });

        it('should log the recorded stacktrace on error', () => {
            const d$ = constant(0).map(() => { throw new Error('the Error'); });
            // tslint:disable-next-line:no-string-literal
            const stack = d$['stack'];
            expect(() => d$.get()).to.throw('the Error');
            expect(console.error).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('the Error', stack);
        });
    });

    it('should not call the deriver when the cached value is known to be up to date because of a reactor', () => {
        const deriver = spy(() => 123);
        const d$ = constant(0).map(deriver);
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
        const d$ = a$.map(deriver).autoCache();
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
        const d$ = constant(0).map(deriver).autoCache();
        expect(d$.get(), 'first time').to.equal(theError);
        expect(d$.get(), 'second time').to.equal(theError);
        expect(deriver).to.have.been.calledOnce;
    });
});
