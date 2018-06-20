import { expect } from 'chai';
import { spy } from 'sinon';
import { SettableDerivable } from '../../interfaces';
import { constant } from '../factories';

/**
 * Tests the `swap()` method.
 */
export function testSwap(factory: <V>(value: V) => SettableDerivable<V>) {
    describe('#swap', () => {
        it('should invoke the swap function with the current value and delegate the work to #set', () => {
            const a$ = factory('a');

            spy(a$, 'set');

            a$.swap(a => a + '!');
            expect(a$.set).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('a!');
            expect(a$.get()).to.equal('a!');
        });

        function add(a: string, b: string) { return a + b; }
        it('should pass any additional parameters to the swap function', () => {
            const a$ = factory('a');

            a$.swap(add, '!');
            expect(a$.get()).to.equal('a!');

            a$.swap(add, constant('!'));
            expect(a$.get()).to.equal('a!!');
        });
    });
}
