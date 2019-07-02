import { observers } from '../../symbols';
import { Atom } from '../atom';
import { Factories } from '../base-derivable.tests';
import { atom } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

export function testFallbackTo(factories: Factories) {
    describe('#fallbackTo', () => {
        it('fallback to the result of the provided function', () => {
            const a$ = factories.unresolved<string>();
            const fallback = jest.fn(() => 42);
            const b$ = a$.fallbackTo(fallback);

            expect(b$.get()).toBe(42);
            expect(fallback).toHaveBeenCalledTimes(1);

            if (isSettableDerivable(a$)) {
                a$.set('a value');
                expect(b$.get()).toBe('a value');
                expect(fallback).toHaveBeenCalledTimes(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(b$.get()).toBe(42);
                    expect(fallback).toHaveBeenCalledTimes(2);
                }
            }
        });

        it('fallback to the value of the provided derivable', () => {
            const a$ = factories.unresolved<string>();
            const fallback$ = atom(42);
            Object.defineProperty(fallback$, 'get', { value: jest.fn(fallback$.get) });
            const b$ = a$.fallbackTo(fallback$);

            expect(b$.get()).toBe(42);
            expect(fallback$.get).toHaveBeenCalledTimes(1);

            if (isSettableDerivable(a$)) {
                a$.set('a value');
                expect(b$.get()).toBe('a value');
                expect(fallback$.get).toHaveBeenCalledTimes(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(b$.get()).toBe(42);
                    expect(fallback$.get).toHaveBeenCalledTimes(2);
                }
            }
        });

        it('should not connect to the fallback when not needed', () => {
            const a$ = factories.unresolved<string>();
            const fallback$ = new Atom(42);
            const b$ = a$.fallbackTo(fallback$);

            expect(fallback$[observers]).toHaveLength(0);
            expect(b$.autoCache().get()).toBe(42);
            expect(fallback$[observers]).toHaveLength(1);

            if (isSettableDerivable(a$)) {
                a$.set('a value');
                b$.get();
                expect(fallback$[observers]).toHaveLength(0);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    b$.get();
                    expect(fallback$[observers]).toHaveLength(1);
                }
            }
        });

        it('fallback to the provided value', () => {
            const a$ = factories.unresolved<string>();
            const b$ = a$.fallbackTo(42);

            expect(b$.get()).toBe(42);

            if (isSettableDerivable(a$)) {
                a$.set('a value');
                expect(b$.get()).toBe('a value');

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(b$.get()).toBe(42);
                }
            }
        });
    });
}
