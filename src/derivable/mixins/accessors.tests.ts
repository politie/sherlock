import { SettableDerivable } from '../../interfaces';
import { internalGetState, observers } from '../../symbols';
import { addObserver } from '../../tracking';
import { $, Factories } from '../base-derivable.tests';
import { constant } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

/**
 * Tests the `get()` method and `value` accessors.
 */
export function testAccessors(factories: Factories, isConstant: boolean) {
    describe('#get', () => {
        it('should return the current state', () => {
            const value$ = factories.value(123);
            expect(value$.get()).toBe(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.get()).toBe(456);
            }
        });

        it(`should ${isConstant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factories.value(123));
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
            const a$ = factories.unresolved<number>();
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
            const a$ = factories.error<number>(new Error('my error message'));
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
            const value$ = factories.value(123);
            expect(value$.getOr('whatever')).toBe(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.getOr('whatever')).toBe(456);
            }
        });

        it(`should ${isConstant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factories.value(123));
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
            const a$ = factories.unresolved<number>();
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
            const a$ = factories.unresolved<number>();
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
            const a$ = factories.unresolved<number>();
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
            const a$ = factories.error<number>(new Error('my error message'));
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
            const a$ = factories.value('a');
            const s = jest.spyOn($(a$), internalGetState as any);

            // Use the getter
            expect(a$.value).toBe('a');

            expect(s).toHaveBeenCalledTimes(1);
        });

        it(`should ${isConstant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factories.value(123));
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
            const a$ = factories.unresolved<number>();
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

        if (isSettableDerivable(factories.value(''))) {
            it('should call #set() when setting the #value property', () => {
                const a$ = factories.value('a') as SettableDerivable<string>;
                const s = jest.spyOn(a$, 'set');

                a$.value = 'b';

                expect(s).toHaveBeenCalledTimes(1);
                expect(s).toHaveBeenCalledWith('b');
            });
        }

        it('should not throw an error when the derivable is in error state', () => {
            const a$ = factories.error<number>(new Error('my error message'));
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
            const a$ = factories.unresolved<string>();
            expect(a$.resolved).toBe(false);
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.resolved).toBe(true);
                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.resolved).toBe(false);
                }
            }
            const b$ = factories.value('with value');
            expect(b$.resolved).toBe(true);
        });
    });

    describe('#errored', () => {
        it('should return the errored status', () => {
            const a$ = factories.error<string>(0);
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
            const b$ = factories.value('with value');
            expect(b$.resolved).toBe(true);
            expect(b$.errored).toBe(false);
        });
    });

    describe('#error', () => {
        it('should return the error when applicable', () => {
            const a$ = factories.error<string>(0);
            expect(a$.error).toBe(0);
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.error).toBeUndefined();
                if (isDerivableAtom(a$)) {
                    a$.setError(1);
                    expect(a$.error).toBe(1);
                }
            }
            const b$ = factories.value('with value');
            expect(b$.error).toBeUndefined();
        });
    });

    describe('#final', () => {
        it('should return the final status', () => {
            let a$ = factories.value<string>('value').autoCache();
            expect(a$.final).toBe(isConstant);
            if (isDerivableAtom(a$)) {
                a$.setFinal('value');
            } else {
                a$ = factories.value('value', true).autoCache();
            }
            expect(a$.final).toBeTrue();
        });
    });
}
