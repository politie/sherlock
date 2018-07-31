import { expect } from 'chai';
import { DerivableAtom } from '../../interfaces';
import { assertDerivableAtom, Factory } from '../base-derivable.spec';

export function testDerivableAtomSetters(factory: Factory) {

    describe('#unset', () => {
        let a$: DerivableAtom<string>;
        beforeEach('create the atom', () => { a$ = assertDerivableAtom(factory('a')); });

        it('should be able to `unset`', () => {
            expect(a$.get()).to.equal('a');
            a$.unset();
            expect(() => a$.get()).to.throw();
        });

        it('should be possible to re`set` an `unset` atom', () => {
            a$.unset();
            a$.set('b');
            expect(a$.get()).to.equal('b');
        });
    });

    describe('#setError', () => {
        let a$: DerivableAtom<string>;
        beforeEach('create the atom', () => { a$ = assertDerivableAtom(factory('a')); });

        it('should be able to change the state to errored', () => {
            expect(a$.get()).to.equal('a');
            a$.setError(new Error('my error'));
            expect(() => a$.get()).to.throw('my error');
        });

        it('should be possible to revert an errored atom to normal', () => {
            a$.setError(new Error('my error'));
            a$.set('a normal value');
            expect(a$.get()).to.equal('a normal value');
        });
    });
}
