import { DerivableAtom } from '../../interfaces';
import { assertDerivableAtom, Factories } from '../base-derivable.tests';

export function testDerivableAtomSetters(factories: Factories) {

    describe('#unset', () => {
        let a$: DerivableAtom<string>;
        beforeEach(() => { a$ = assertDerivableAtom(factories.value('a')); });

        it('should be able to `unset`', () => {
            expect(a$.get()).toBe('a');
            a$.unset();
            expect(() => a$.get()).toThrowError();
        });

        it('should be possible to re`set` an `unset` atom', () => {
            a$.unset();
            a$.set('b');
            expect(a$.get()).toBe('b');
        });
    });

    describe('#setError', () => {
        let a$: DerivableAtom<string>;
        beforeEach(() => { a$ = assertDerivableAtom(factories.value('a')); });

        it('should be able to change the state to errored', () => {
            expect(a$.get()).toBe('a');
            a$.setError(new Error('my error'));
            expect(() => a$.get()).toThrowError('my error');
        });

        it('should be possible to revert an errored atom to normal', () => {
            a$.setError(new Error('my error'));
            a$.set('a normal value');
            expect(a$.get()).toBe('a normal value');
        });
    });

    describe('#setFinal', () => {
        let a$: DerivableAtom<string>;
        beforeEach(() => { a$ = assertDerivableAtom(factories.value('a')); });

        it('should be able to change the state to final', () => {
            expect(a$.get()).toBe('a');
            expect(a$.final).toBeFalse();
            a$.setFinal('a');
            expect(a$.get()).toBe('a');
            expect(a$.final).toBeTrue();
        });

        it('should not be possible to change the state back to normal', () => {
            a$.setFinal('a');
            expect(() => a$.set('b')).toThrowError('cannot set a final atom');
        });
    });
}
