import { DerivableAtom } from '../../interfaces';
import { assertDerivableAtom, Factory } from '../base-derivable.tests';

export function testDerivableAtomSetters(factory: Factory) {

    describe('#unset', () => {
        let a$: DerivableAtom<string>;
        beforeEach(() => { a$ = assertDerivableAtom(factory('a')); });

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
        beforeEach(() => { a$ = assertDerivableAtom(factory('a')); });

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
}
