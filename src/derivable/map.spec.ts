import { expect } from 'chai';
import { spy } from 'sinon';
import { unresolved } from '../symbols';
import { config, ErrorWrapper } from '../utils';
import { Atom } from './atom';
import { $, testDerivable } from './base-derivable.spec';
import { Constant } from './constant';
import { testAutocache } from './derivation.spec';
import { atom, constant, lens } from './factories';
import { isDerivableAtom } from './typeguards';

describe('derivable/map', () => {
    context('(based on atom)', () => {
        testDerivable(v => new Atom(v).map(d => d));
        testDerivable(v => new Atom(v).map(d => d, d => d), 'atom', 'settable');
    });

    context('(sandwiched)', () => {
        testDerivable(v => {
            const a$ = new Atom(v);
            const sw$ = a$.derive(e => e).map(e => e).derive(e => e);
            return lens({
                get: () => sw$.get(),
                set: value => a$.set(value),
            });
        }, 'settable');
    });

    context('(based on constant)', () => {
        testDerivable(v => new Constant(v).map(d => d));
    });

    context('(bi-mapping)', () => {
        testDerivable(v => (new Atom(v === unresolved || v instanceof ErrorWrapper ? v : { value: v })).map(
            obj => obj.value,
            value => ({ value }),
        ), 'atom', 'settable');

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

            it('should return a DerivableAtom iff the base is a DerivableAtom', () => {
                const a$ = atom(0);
                const l$ = lens({ get: () => 0, set: () => 0 });
                expect(isDerivableAtom(a$.map(v => v, v => v))).to.be.true;
                expect(isDerivableAtom(a$.map(v => v))).to.be.false;
                expect(isDerivableAtom(l$.map(v => v, v => v))).to.be.false;
            });

            it('should only call the mapper on resolved values', () => {
                const a$ = atom.unresolved<number>();
                const getter = spy((v: number) => v + 1);
                const setter = spy((v: number) => v - 1);
                const m$ = a$.map<number>(getter, setter);

                expect(m$.resolved).to.be.false;
                expect(getter).to.not.have.been.called;
                expect(setter).to.not.have.been.called;

                m$.setError('terrible error occurred');
                expect(a$.error).to.equal('terrible error occurred');
                expect(getter).to.not.have.been.called;
                expect(setter).to.not.have.been.called;

                a$.set(1);
                expect(m$.get()).to.equal(2);
                m$.set(3);
                expect(a$.get()).to.equal(2);
                expect(getter).to.have.been.calledOnce;
                expect(setter).to.have.been.calledOnce;
            });
        });
    });

    context('(bi-state-mapping)', () => {
        testDerivable(v => (new Atom(v === unresolved || v instanceof ErrorWrapper ? v : { value: v })).mapState(
            obj => obj === unresolved || obj instanceof ErrorWrapper ? obj : obj.value,
            value => value === unresolved || value instanceof ErrorWrapper ? value : ({ value }),
        ), 'atom', 'settable');

        it('should return a DerivableAtom iff the base is a DerivableAtom', () => {
            const a$ = atom(0);
            const l$ = lens({ get: () => 0, set: () => 0 });
            expect(isDerivableAtom(a$.mapState(v => v, v => v))).to.be.true;
            expect(isDerivableAtom(a$.mapState(v => v))).to.be.false;
            expect(isDerivableAtom(l$.mapState(v => v, v => v))).to.be.false;
        });

        it('should allow mapping arbitrary states to arbitrary states during set on DerivableAtoms', () => {
            const a$ = atom(1);
            const m$ = a$.mapState(
                baseValue => baseValue,
                newValue => newValue === 2 ? unresolved : newValue,
            );
            m$.set(2);
            expect(a$.resolved).to.be.false;
            m$.set(3);
            expect(a$.get()).to.equal(3);
        });

        it('should allow only mapping values to values during set on non-DerivableAtoms', () => {
            let value = 0;
            const l$ = lens({ get: () => value + 1, set: v => value = v - 1 });
            const m$ = l$.mapState(
                baseValue => baseValue,
                // Not allowed by typings, so therefore `as any`
                newValue => newValue === 2 ? unresolved as any : newValue,
            );
            m$.set(3);
            expect(value).to.equal(2);
            expect(() => m$.set(2)).to.throw();
        });
    });

    testAutocache((a$, deriver) => a$.map(deriver));

    it('should not generate a stacktrace on instantiation', () => {
        expect(constant(0).map(() => 0).creationStack).to.be.undefined;
    });

    context('in debug mode', () => {
        before('setDebugMode', () => { config.debugMode = true; });
        after('resetDebugMode', () => { config.debugMode = false; });

        it('should augment an error when it is caught in the deriver function', () => {
            const d$ = constant(0).map(() => { throw new Error('the Error'); });
            expect(() => d$.get()).to.throw('the Error');
            try {
                d$.get();
            } catch (e) {
                expect(e.stack).to.contain('the Error');
                expect(e.stack).to.contain(d$.creationStack!);
            }
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

    it('should disconnect when no longer used', () => {
        const a$ = atom(1);
        const m$ = a$.map(v => v);
        const d$ = m$.derive(v => v);

        expect(d$.connected).to.be.false;
        expect(m$.connected).to.be.false;
        expect(a$.connected).to.be.false;

        const stopReaction = d$.react(() => 0);

        expect(d$.connected).to.be.true;
        expect(m$.connected).to.be.true;
        expect(a$.connected).to.be.true;

        stopReaction();

        expect(d$.connected).to.be.false;
        expect(m$.connected).to.be.false;
        expect(a$.connected).to.be.false;
    });

    it('should call the deriver again when the cached value is known not to be up to date', () => {
        const deriver = spy((n: number) => n * 2);
        const a$ = atom(1);
        const m$ = a$.map(deriver);
        const d$ = m$.derive(v => v);
        const stopReaction = d$.react(() => 0);
        expect(deriver).to.have.been.calledOnce;
        expect(d$.get()).to.equal(2);
        expect(deriver).to.have.been.calledOnce;
        stopReaction();
        expect(deriver).to.have.been.calledOnce;
        a$.set(2);
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

    it('should use the Mapping object as `this`', () => {
        const base$ = new Atom(1);
        const mapping1$ = base$.map(function (this: any) { expect(this).to.equal(mapping1$); return 1; });
        const mapping2$ = base$.mapState(function (this: any) { expect(this).to.equal(mapping2$); return 2; });
        expect(mapping1$.get()).to.equal(1);
        expect(mapping2$.get()).to.equal(2);
    });

    it('should use the BiMapping object as `this`', done => {
        const base$ = new Atom(1);
        const bimapping1$ = base$.map(
            function (this: any) { expect(this).to.equal(bimapping1$); return 1; },
            function (this: any) { expect(this).to.equal(bimapping1$); return 1; },
        );
        const bimapping2$ = base$.mapState(
            function (this: any) { expect(this).to.equal(bimapping2$); return 2; },
            function (this: any) { expect(this).to.equal(bimapping2$); done(); return 2; },
        );
        expect(bimapping1$.get()).to.equal(1);
        expect(bimapping2$.get()).to.equal(2);
        bimapping1$.set(2);
        bimapping2$.set(3);
    });
});
