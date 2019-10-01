import { Factories } from '../base-derivable.tests';
import { atom, constant } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

export function testFlatMap(factories: Factories) {
    describe('#flatmap', () => {
        it('should return the value of the inner derivable', () => {
            const deriver = jest.fn(constant);
            const base$ = factories.value('some value');
            const alreadyFinal = base$.final;
            const d$ = base$.flatMap(deriver);
            expect(deriver).not.toHaveBeenCalled();
            expect(d$.get()).toBe('some value');
            expect(d$.get()).toBe('some value');
            expect(deriver).toHaveBeenCalledTimes(alreadyFinal ? 1 : 2);
            expect(deriver).toHaveBeenCalledWith('some value');
            d$.autoCache();
            expect(d$.get()).toBe('some value');
            expect(d$.get()).toBe('some value');
            expect(deriver).toHaveBeenCalledTimes(alreadyFinal ? 1 : 3);
        });

        it('should only run the deriver when the base derivable changes, not when the inner derivable fires', () => {
            const base$ = factories.value('some value');
            const inner$ = atom.unresolved<string>();
            const deriver = jest.fn(() => inner$);
            const d$ = base$.flatMap(deriver);
            let value = 'unset';
            d$.react(v => value = v);
            expect(value).toBe('unset');
            inner$.set('whatever value');
            expect(value).toBe('whatever value');
            inner$.set('yet another value');
            expect(value).toBe('yet another value');
            expect(deriver).toHaveBeenCalledTimes(1);
            expect(deriver).toHaveBeenCalledWith('some value');

            if (isSettableDerivable(base$)) {
                base$.set('base value changes');
                expect(value).toBe('yet another value');
                expect(deriver).toHaveBeenCalledTimes(2);
                expect(deriver).toHaveBeenCalledWith('base value changes');

                if (isDerivableAtom(base$)) {
                    base$.unset();
                    expect(value).toBe('yet another value');
                    expect(deriver).toHaveBeenCalledTimes(2);
                    expect(deriver).toHaveBeenCalledWith('base value changes');
                }
            }
        });

        it('should be final only when both base and produced derivable are final', () => {
            const base$ = factories.value('outer value');
            const inner$ = atom('inner value');
            const d$ = base$.flatMap(() => inner$);
            expect(d$.autoCache().final).toBeFalse();
            expect(d$.get()).toBe('inner value');
            inner$.setFinal('final inner value');
            expect(d$.final).toBe(base$.final);
            expect(d$.get()).toBe('final inner value');

            if (isDerivableAtom(base$)) {
                base$.setFinal('final outer value');
                expect(d$.final).toBeTrue();
                expect(d$.get()).toBe('final inner value');
            }
        });
    });
}
