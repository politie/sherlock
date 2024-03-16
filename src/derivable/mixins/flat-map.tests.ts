import { assertDerivableAtom, assertSettable, Factories } from '../base-derivable.tests';
import { isDerivableAtom } from '../typeguards';

export function testFlatMap(factories: Factories, isSettable: boolean, isAtom: boolean) {
    describe('#flatmap', () => {
        it('should return the value of the inner derivable', () => {
            const deriver = jest.fn(factories.value);
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

        isSettable && it('should only run the deriver when the base derivable changes, not when the inner derivable fires', () => {
            const base$ = assertSettable(factories.value('some value'));
            const inner$ = assertSettable(factories.unresolved<string>());
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
        });

        isSettable && it('should disconnect from all but the latest inner derivable', () => {
            const base$ = assertSettable(factories.value('a'));
            const inner$s = {
                a: assertSettable(factories.value('inner a')),
                b: assertSettable(factories.value('inner b')),
            };
            const deriver = jest.fn((v: string) => inner$s[v]);
            const d$ = base$.flatMap(deriver).autoCache();
            expect(d$.get()).toBe('inner a');

            expect(inner$s.a.connected).toBeTrue();
            expect(inner$s.b.connected).toBeFalse();

            base$.set('b');
            expect(d$.get()).toBe('inner b');
            expect(inner$s.a.connected).toBeFalse();
            expect(inner$s.b.connected).toBeTrue();
        });

        it('should error when the outer derivable errors', () => {
            const base$ = factories.error<string>('my error');
            const deriver = jest.fn(() => factories.value(''));
            const d$ = base$.flatMap(deriver);
            expect(d$.error).toBe('my error');
            expect(d$.autoCache().error).toBe('my error');
            expect(deriver).not.toHaveBeenCalled();
        });

        it('should error when the inner derivable errors', () => {
            const base$ = factories.value('my value');
            const inner$ = factories.error<string>('my error');
            const deriver = jest.fn(() => inner$);
            const d$ = base$.flatMap(deriver);
            expect(d$.error).toBe('my error');
            expect(d$.autoCache().error).toBe('my error');
        });

        isAtom && it('should be final only when both base and produced derivable are final', () => {
            const base$ = assertDerivableAtom(factories.value('outer value'));
            const inner$ = assertDerivableAtom(factories.value('inner value'));
            const d$ = base$.flatMap(() => inner$);
            expect(d$.autoCache().final).toBeFalse();
            expect(d$.get()).toBe('inner value');
            inner$.setFinal('final inner value');
            expect(d$.final).toBe(base$.final);
            expect(d$.get()).toBe('final inner value');

            base$.setFinal('final outer value');
            expect(d$.final).toBeTrue();
            expect(d$.get()).toBe('final inner value');
        });
    });
}
