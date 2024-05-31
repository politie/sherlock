import { unresolved } from '../symbols';
import { config, isError } from '../utils';
import { Atom } from './atom';
import { $, testDerivable } from './base-derivable.tests';
import { testAutocache } from './derivation.test';
import { atom, constant, lens } from './factories';
import { isUnresolvedOrErrorWrapper } from './map';
import { isDerivableAtom } from './typeguards';

describe('derivable/map', () => {
    describe('(based on atom)', () => {
        testDerivable(a$ => a$.map(d => d));
        testDerivable(a$ => a$.map(d => d, d => d), 'atom', 'settable');
    });

    describe('(sandwiched)', () => {
        testDerivable(a$ => {
            const sw$ = a$.derive(e => e).map(e => e).derive(e => e);
            return lens({
                get: () => sw$.get(),
                set: value => a$.set(value),
            });
        }, 'settable');
    });

    describe('(based on constant)', () => {
        testDerivable(a$ => {
            a$.setFinal(a$.getState());
            return a$.map(d => d);
        }, 'final');
    });

    describe('(bi-mapping)', () => {
        testDerivable(
            <V>(a$: Atom<V>) => {
                const startValue = a$.map(val => ({ val })).getMaybeFinalState();
                return new Atom(startValue).map(obj => obj.val, val => ({ val }));
            },
            'atom', 'settable',
        );

        describe('#set', () => {
            it('should change the current state (and version) of the parent atom', () => {
                const a$ = $(atom('a'));
                const lensed$ = a$.map(v => v, v => v);
                expect(lensed$.get()).toBe('a');
                expect(a$.version).toBe(0);

                lensed$.set('b');
                expect(lensed$.get()).toBe('b');
                expect(a$.version).toBe(1);
            });

            it('should not update the version if the new value equals the previous value', () => {
                const a$ = $(atom('a'));
                const lensed$ = a$.map(v => v, v => v);
                expect(lensed$.get()).toBe('a');
                expect(a$.version).toBe(0);
                lensed$.set('a');
                expect(lensed$.get()).toBe('a');
                expect(a$.version).toBe(0);
            });

            it('should return a DerivableAtom iff the base is a DerivableAtom', () => {
                const a$ = atom(0);
                const l$ = lens({ get: () => 0, set: () => 0 });
                expect(isDerivableAtom(a$.map(v => v, v => v))).toBe(true);
                expect(isDerivableAtom(a$.map(v => v))).toBe(false);
                expect(isDerivableAtom(l$.map(v => v, v => v))).toBe(false);
            });

            it('should only call the mapper on resolved values', () => {
                const a$ = atom.unresolved<number>();
                const getter = jest.fn((v: number) => v + 1);
                const setter = jest.fn((v: number) => v - 1);
                const m$ = a$.map<number>(getter, setter);

                expect(m$.resolved).toBe(false);
                expect(getter).not.toHaveBeenCalled();
                expect(setter).not.toHaveBeenCalled();

                m$.setError('terrible error occurred');
                expect(a$.error).toBe('terrible error occurred');
                expect(getter).not.toHaveBeenCalled();
                expect(setter).not.toHaveBeenCalled();

                a$.set(1);
                expect(m$.get()).toBe(2);
                m$.set(3);
                expect(a$.get()).toBe(2);
                expect(getter).toHaveBeenCalledTimes(1);
                expect(setter).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('(bi-state-mapping)', () => {
        testDerivable(
            <V>(a$: Atom<V>) => new Atom(a$.map(val => ({ val })).getMaybeFinalState())
                .mapState(
                    obj => isUnresolvedOrErrorWrapper(obj) ? obj : obj.val,
                    val => isUnresolvedOrErrorWrapper(val) ? val : ({ val }),
                ),
            'atom', 'settable',
        );

        it('should return a DerivableAtom iff the base is a DerivableAtom', () => {
            const a$ = atom(0);
            const l$ = lens({ get: () => 0, set: () => 0 });
            expect(isDerivableAtom(a$.mapState(v => v, v => v))).toBe(true);
            expect(isDerivableAtom(a$.mapState(v => v))).toBe(false);
            expect(isDerivableAtom(l$.mapState(v => v, v => v))).toBe(false);
        });

        it('should allow mapping arbitrary states to arbitrary states during set on DerivableAtoms', () => {
            const a$ = atom(1);
            const m$ = a$.mapState(
                baseValue => baseValue,
                newValue => newValue === 2 ? unresolved : newValue,
            );
            m$.set(2);
            expect(a$.resolved).toBe(false);
            m$.set(3);
            expect(a$.get()).toBe(3);
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
            expect(value).toBe(2);
            expect(() => m$.set(2)).toThrowError();
        });
    });

    testAutocache((a$, deriver) => a$.map(deriver));

    it('should not generate a stacktrace on instantiation', () => {
        expect(constant(0).map(() => 0).creationStack).toBeUndefined();
    });

    describe('in debug mode', () => {
        beforeAll(() => { config.debugMode = true; });
        afterAll(() => { config.debugMode = false; });

        it('should augment an error when it is caught in the deriver function', () => {
            const d$ = constant(0).map(() => { throw new Error('the Error'); });
            expect(() => d$.get()).toThrowError('the Error');
            try {
                d$.get();
            } catch (e) {
                expect(isError(e)).toBeTrue();

                const stack = (e as Error).stack;
                expect(stack).toContain('the Error');
                expect(stack).toContain(d$.creationStack);
            }
        });
    });

    it('should not call the deriver when the cached value is known to be up to date because of a reactor', () => {
        const deriver = jest.fn(() => 123);
        const d$ = atom(0).map(deriver);
        d$.get();
        expect(deriver).toHaveBeenCalledTimes(1);
        d$.react(() => 0);
        expect(deriver).toHaveBeenCalledTimes(2);
        d$.get();
        expect(deriver).toHaveBeenCalledTimes(2);
    });

    it('should disconnect when no longer used', () => {
        const a$ = atom(1);
        const m$ = a$.map(v => v);
        const d$ = m$.derive(v => v);

        expect(d$.connected).toBe(false);
        expect(m$.connected).toBe(false);
        expect(a$.connected).toBe(false);

        const stopReaction = d$.react(() => 0);

        expect(d$.connected).toBe(true);
        expect(m$.connected).toBe(true);
        expect(a$.connected).toBe(true);

        stopReaction();

        expect(d$.connected).toBe(false);
        expect(m$.connected).toBe(false);
        expect(a$.connected).toBe(false);
    });

    it('should call the deriver again when the cached value is known not to be up to date', () => {
        const deriver = jest.fn((n: number) => n * 2);
        const a$ = atom(1);
        const m$ = a$.map(deriver);
        const d$ = m$.derive(v => v);
        const stopReaction = d$.react(() => 0);
        expect(deriver).toHaveBeenCalledTimes(1);
        expect(d$.get()).toBe(2);
        expect(deriver).toHaveBeenCalledTimes(1);
        stopReaction();
        expect(deriver).toHaveBeenCalledTimes(1);
        a$.set(2);
        d$.get();
        expect(deriver).toHaveBeenCalledTimes(2);
    });

    it('should cache thrown errors to rethrow them on multiple accesses until the derivation produces a new result', () => {
        const a$ = atom(false);
        const theError = new Error('the error');
        const deriver = jest.fn((a: boolean) => { if (a) { throw theError; } else { return 'a value'; } });
        const d$ = a$.map(deriver).autoCache();
        expect(d$.get()).toBe('a value');
        expect(d$.get()).toBe('a value');
        expect(deriver).toHaveBeenCalledTimes(1);
        a$.set(true);
        expect(() => d$.get()).toThrowError(theError);
        expect(() => d$.get()).toThrowError(theError);
        expect(deriver).toHaveBeenCalledTimes(2);
        a$.set(false);
        expect(d$.get()).toBe('a value');
        expect(d$.get()).toBe('a value');
        expect(deriver).toHaveBeenCalledTimes(3);
    });

    it('should use the Mapping object as `this`', () => {
        const base$ = new Atom(1);
        const mapping1$ = base$.map(function (this: any) { expect(this).toBe(mapping1$); return 1; });
        const mapping2$ = base$.mapState(function (this: any) { expect(this).toBe(mapping2$); return 2; });
        expect(mapping1$.get()).toBe(1);
        expect(mapping2$.get()).toBe(2);
    });

    it('should use the BiMapping object as `this`', done => {
        const base$ = new Atom(1);
        const bimapping1$ = base$.map(
            function (this: any) { expect(this).toBe(bimapping1$); return 1; },
            function (this: any) { expect(this).toBe(bimapping1$); return 1; },
        );
        const bimapping2$ = base$.mapState(
            function (this: any) { expect(this).toBe(bimapping2$); return 2; },
            function (this: any) { expect(this).toBe(bimapping2$); done(); return 2; },
        );
        expect(bimapping1$.get()).toBe(1);
        expect(bimapping2$.get()).toBe(2);
        bimapping1$.set(2);
        bimapping2$.set(3);
    });
});
