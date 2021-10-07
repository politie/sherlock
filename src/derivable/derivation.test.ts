import { Derivable, SettableDerivable } from '../interfaces';
import { unresolved } from '../symbols';
import { config, isError } from '../utils';
import { testDerivable } from './base-derivable.tests';
import { Derivation } from './derivation';
import { atom, derive } from './factories';

describe('derivable/derive', () => {
    describe('(standalone)', () => {
        testDerivable(
            {
                error: error => derive(() => { throw error; }),
                unresolved: <V>() => derive<V>(() => unresolved),
                value: value => derive(() => value),
            }, 'final');
    });

    describe('(based on atom)', () => {
        testDerivable(a$ => a$.derive(d => d));
    });

    describe('(based on constant)', () => {
        testDerivable(a$ => {
            a$.setFinal(a$.getState());
            return a$.derive(d => d);
        }, 'final');
    });

    testAutocache((a$, deriver) => a$.derive(deriver));

    it('should not generate a stacktrace on instantiation', () => {
        expect(derive(() => 0).creationStack).toBeUndefined();
    });

    describe('in debug mode', () => {
        beforeAll(() => { config.debugMode = true; });
        afterAll(() => { config.debugMode = false; });

        it('should augment an error when it is caught in the deriver function', () => {
            const d$ = derive(() => { throw new Error('the Error'); });
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
        const d$ = derive(deriver);
        d$.get();
        expect(deriver).toHaveBeenCalledTimes(1);
        d$.react(() => 0);
        expect(deriver).toHaveBeenCalledTimes(2);
        d$.get();
        expect(deriver).toHaveBeenCalledTimes(2);
    });

    it('should cache thrown errors to rethrow them on multiple accesses until the derivation produces a new result', () => {
        const a$ = atom(false);
        const theError = new Error('the error');
        const deriver = jest.fn((a: boolean) => { if (a) { throw theError; } else { return 'a value'; } });
        const d$ = a$.derive(deriver).autoCache();
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

    it('should allow error objects as valid values', () => {
        const theError = new Error('the error');
        const deriver = jest.fn(() => theError);
        const d$ = derive(deriver).autoCache();
        expect(d$.get()).toBe(theError);
        expect(d$.get()).toBe(theError);
        expect(deriver).toHaveBeenCalledTimes(1);
    });

    it('should use the Derivation object as `this`', () => {
        const derivation$ = new Derivation(function () { expect(this).toBe(derivation$); return 1; });
        expect(derivation$.get()).toBe(1);
    });
});

export function testAutocache(factory: (a$: Derivable<string>, deriver: (v: string) => string) => Derivable<string>) {

    describe('#autoCache', () => {
        jest.useFakeTimers();
        afterEach(() => { jest.runAllTimers(); });

        let a$: SettableDerivable<string>;
        beforeEach(() => { a$ = atom('value'); });

        let deriver: jest.Mock;
        beforeEach(() => { deriver = jest.fn((v = 'empty') => v + '!'); });

        let d$: Derivable<string>;
        beforeEach(() => { d$ = factory(a$, deriver).autoCache(); });

        it('should automatically cache the value of the Derivable the first time in a tick', () => {
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);
            expect(d$.get()).toBe('value!');
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);
        });

        it('should stop the cache after the tick', () => {
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(0);

            expect(deriver).toHaveBeenCalledTimes(1);
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(2);

            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(2);
        });

        it('should keep the value updated', () => {
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);

            a$.set('another value');
            expect(deriver).toHaveBeenCalledTimes(1);
            expect(d$.get()).toBe('another value!');
            expect(deriver).toHaveBeenCalledTimes(2);
            expect(d$.get()).toBe('another value!');
            expect(deriver).toHaveBeenCalledTimes(2);
        });

        it('should start a reactor without recalculation', () => {
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);

            const received: string[] = [];
            d$.react(v => received.push(v));
            expect(received).toEqual(['value!']);
            expect(deriver).toHaveBeenCalledTimes(1);

            a$.set('another value');
            expect(received).toEqual(['value!', 'another value!']);
            expect(deriver).toHaveBeenCalledTimes(2);
        });

        it('should not interfere with reactor observation after a tick', () => {
            expect(d$.get()).toBe('value!');

            const received: string[] = [];
            d$.react(v => received.push(v));
            expect(received).toEqual(['value!']);

            jest.advanceTimersByTime(0);

            a$.set('another value');
            expect(received).toEqual(['value!', 'another value!']);
        });

        it('should cache derivables until the next tick even when all existing observers disappear', () => {
            const stopReactor = d$.react(() => void 0);
            expect(deriver).toHaveBeenCalledTimes(1);

            // Value is already cached, so autoCacheMode has no effect now.
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);

            stopReactor();

            // Value should still be cached even when all reactors are stopped.
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(0);

            // Only after the tick, the cache may be released.
            expect(d$.get()).toBe('value!');
            expect(deriver).toHaveBeenCalledTimes(2);
        });

        it('should not set multiple timeouts simultaneously', () => {
            const alt$ = factory(atom('abc'), s => s).autoCache();

            const setTimeout = jest.spyOn(global, 'setTimeout');
            expect(setTimeout).not.toHaveBeenCalled();
            d$.get();
            expect(setTimeout).toHaveBeenCalledTimes(1);
            alt$.get();
            expect(setTimeout).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(0);
            alt$.get();
            expect(setTimeout).toHaveBeenCalledTimes(2);
            d$.get();
            expect(setTimeout).toHaveBeenCalledTimes(2);
        });
    });
}
