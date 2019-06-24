import { SettableDerivable } from '../../interfaces';
import { internalGetState, observers, unresolved } from '../../symbols';
import { addObserver } from '../../tracking';
import { ErrorWrapper } from '../../utils';
import { $, Factory } from '../base-derivable.tests';
import { constant } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

/**
 * Tests the `get()` method and `value` accessors.
 */
export function testAccessors(factory: Factory, isConstant: boolean) {
    describe('#get', () => {
        it('should return the current state', () => {
            const value$ = factory(123);
            expect(value$.get()).toBe(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.get()).toBe(456);
            }
        });

        it(`should ${isConstant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$[observers]).toHaveLength(0);
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$[observers]).toHaveLength(0);

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.get();

            if (isConstant) {
                expect(value$[observers]).toHaveLength(0);
            } else {
                expect(value$[observers]).toHaveLength(1);
                expect(value$[observers][0]).toBe(derived$);
            }
        });

        it('should throw an Error when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(() => a$.get()).toThrowError('Could not get value, derivable is unresolved');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.get()).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(() => a$.get()).toThrowError('Could not get value, derivable is unresolved');
                }
            }
        });

        it('should throw an error when the derivable is in error state', () => {
            const a$ = factory<number>(new ErrorWrapper(new Error('my error message')));
            expect(() => a$.get()).toThrowError('my error message');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.get()).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.setError(new Error('whatever'));
                    expect(() => a$.get()).toThrowError('whatever');
                }
            }
        });
    });

    describe('#getOr', () => {
        it('should return the current state', () => {
            const value$ = factory(123);
            expect(value$.getOr('whatever')).toBe(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.getOr('whatever')).toBe(456);
            }
        });

        it(`should ${isConstant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$[observers]).toHaveLength(0);
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$[observers]).toHaveLength(0);

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.getOr('whatever');

            if (isConstant) {
                expect(value$[observers]).toHaveLength(0);
            } else {
                expect(value$[observers]).toHaveLength(1);
                expect(value$[observers][0]).toBe(derived$);
            }
        });

        it('should return the fallback when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(a$.getOr('fallback')).toBe('fallback');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr('fallback')).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.getOr('fallback')).toBe('fallback');
                }
            }
        });

        it('should call the provided function when unresolved', () => {
            const a$ = factory<number>(unresolved);
            const fallback = jest.fn(() => 'fallback');
            expect(a$.getOr(fallback)).toBe('fallback');
            expect(fallback).toHaveBeenCalledTimes(1);

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr(fallback)).toBe(1);
                expect(fallback).toHaveBeenCalledTimes(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.getOr(fallback)).toBe('fallback');
                    expect(fallback).toHaveBeenCalledTimes(2);
                }
            }
        });

        it('should fallback to the provided derivable when unresolved', () => {
            const a$ = factory<number>(unresolved);
            const fallback = constant('fallback');
            expect(a$.getOr(fallback)).toBe('fallback');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr(fallback)).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.getOr(fallback)).toBe('fallback');
                }
            }
        });

        it('should throw an error when the derivable is in error state', () => {
            const a$ = factory<number>(new ErrorWrapper(new Error('my error message')));
            expect(() => a$.getOr('fallback')).toThrowError('my error message');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr('fallback')).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.setError(new Error('whatever'));
                    expect(() => a$.getOr('fallback')).toThrowError('whatever');
                }
            }
        });
    });

    describe('#value', () => {
        it('should call #getState() when getting the #value property', () => {
            const a$ = factory('a');
            const s = jest.spyOn($(a$), internalGetState as any);

            // Use the getter
            expect(a$.value).toBe('a');

            expect(s).toHaveBeenCalledTimes(1);
        });

        it(`should ${isConstant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$[observers]).toHaveLength(0);
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$[observers]).toHaveLength(0);

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.value;

            if (isConstant) {
                expect(value$[observers]).toHaveLength(0);
            } else {
                expect(value$[observers]).toHaveLength(1);
                expect(value$[observers][0]).toBe(derived$);
            }
        });

        it('should return undefined when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(a$.value).toBeUndefined();

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.value).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.value).toBeUndefined();
                }
            }
        });

        if (isSettableDerivable(factory(''))) {
            it('should call #set() when setting the #value property', () => {
                const a$ = factory('a') as SettableDerivable<string>;
                const s = jest.spyOn(a$, 'set');

                a$.value = 'b';

                expect(s).toHaveBeenCalledTimes(1);
                expect(s).toHaveBeenCalledWith('b');
            });
        }

        it('should not throw an error when the derivable is in error state', () => {
            const a$ = factory<number>(new ErrorWrapper(new Error('my error message')));
            expect(a$.value).toBeUndefined();

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.value).toBe(1);

                if (isDerivableAtom(a$)) {
                    a$.setError(new Error('whatever'));
                    expect(a$.value).toBeUndefined();
                }
            }
        });
    });

    describe('#resolved', () => {
        it('should return the resolved status', () => {
            const a$ = factory<string>(unresolved);
            expect(a$.resolved).toBe(false);
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.resolved).toBe(true);
                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.resolved).toBe(false);
                }
            }
            const b$ = factory('with value');
            expect(b$.resolved).toBe(true);
        });
    });

    describe('#errored', () => {
        it('should return the errored status', () => {
            const a$ = factory<string>(new ErrorWrapper(0));
            expect(a$.resolved).toBe(true);
            expect(a$.errored).toBe(true);
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.resolved).toBe(true);
                expect(a$.errored).toBe(false);
                if (isDerivableAtom(a$)) {
                    a$.setError(0);
                    expect(a$.resolved).toBe(true);
                    expect(a$.errored).toBe(true);
                }
            }
            const b$ = factory('with value');
            expect(b$.resolved).toBe(true);
            expect(b$.errored).toBe(false);
        });
    });

    describe('#error', () => {
        it('should return the error when applicable', () => {
            const a$ = factory<string>(new ErrorWrapper(0));
            expect(a$.error).toBe(0);
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.error).toBeUndefined();
                if (isDerivableAtom(a$)) {
                    a$.setError(1);
                    expect(a$.error).toBe(1);
                }
            }
            const b$ = factory('with value');
            expect(b$.error).toBeUndefined();
        });
    });
}
