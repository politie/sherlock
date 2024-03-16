import { List, Seq } from 'immutable';
import { internalGetState } from '../../symbols';
import { $, Factories } from '../base-derivable.tests';
import { atom } from '../factories';

/**
 * Tests the `is()`, `or()`, `and()` and `not()` methods.
 */
export function testBooleanFuncs(factories: Factories) {
    describe('(boolean functions)', () => {
        const true$ = factories.value(true);
        const false$ = factories.value(false);
        const bool$ = atom(false);

        beforeEach(() => {
            bool$.set(false);
        });

        describe('#is', () => {
            it('should report equality on values', () => {
                const value$ = factories.value('value');
                expect(value$.is('value').get()).toBe(true);
                expect(value$.is('something else').get()).toBe(false);
            });

            it('should report equality on derivables', () => {
                const value$ = factories.value('value');
                const atom$ = atom('value');
                const valueIsAtom$ = value$.is(atom$);
                expect(valueIsAtom$.get()).toBe(true);
                atom$.set('something else');
                expect(valueIsAtom$.get()).toBe(false);
            });

            it('should use the utils.equals function', () => {
                const a$ = factories.value(List.of(1, 2, 3));
                const b$ = factories.value(Seq.Indexed.of(1, 2, 3));
                expect(a$.is(b$).get()).toBe(true);
            });
        });

        describe('#or', () => {
            const trueOrBool$ = true$.or(bool$);
            const falseOrBool$ = false$.or(bool$);

            it('should apply boolean OR on the two derivables', () => {
                expect(trueOrBool$.get()).toBe(true);
                expect(falseOrBool$.get()).toBe(false);
                bool$.set(true);
                expect(trueOrBool$.get()).toBe(true);
                expect(falseOrBool$.get()).toBe(true);
            });

            it('should not observe the right operand when the left operand is truthy', () => {
                const s = jest.spyOn($(bool$), internalGetState as any);
                trueOrBool$.get();
                expect(s).not.toHaveBeenCalled();
                falseOrBool$.get();
                expect(s).toHaveBeenCalledTimes(1);
                s.mockRestore();
            });
        });

        describe('#and', () => {
            const trueAndBool$ = true$.and(bool$);
            const falseAndBool$ = false$.and(bool$);

            it('should apply boolean AND on the two derivables', () => {
                expect(trueAndBool$.get()).toBe(false);
                expect(falseAndBool$.get()).toBe(false);
                bool$.set(true);
                expect(trueAndBool$.get()).toBe(true);
                expect(falseAndBool$.get()).toBe(false);
            });

            it('should not observe the right operand when the left operand is falsey', () => {
                const s = jest.spyOn($(bool$), internalGetState as any);
                falseAndBool$.get();
                expect(s).not.toHaveBeenCalled();
                trueAndBool$.get();
                expect(s).toHaveBeenCalledTimes(1);
                s.mockRestore();
            });
        });

        describe('#not', () => {
            it('should apply boolean NOT on the input derivable', () => {
                expect(false$.not().get()).toBe(true);
                expect(true$.not().get()).toBe(false);
            });
        });

    });
}
