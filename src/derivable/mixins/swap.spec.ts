import { expect } from 'chai';
import { spy } from 'sinon';
import { assertSettable, Factory } from '../base-derivable.spec';
import { constant } from '../factories';

/**
 * Tests the `swap()` method.
 */
export function testSwap(factory: Factory) {
    describe('#swap', () => {
        it('should invoke the swap function with the current value and delegate the work to #set', () => {
            const a$ = assertSettable(factory('a'));

            spy(a$, 'set');

            a$.swap(a => a + '!');
            expect(a$.set).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('a!');
            expect(a$.get()).to.equal('a!');
        });

        function add(a: string, b: string) { return a + b; }
        it('should pass any additional parameters to the swap function', () => {
            const a$ = assertSettable(factory('a'));

            a$.swap(add, '!');
            expect(a$.get()).to.equal('a!');

            a$.swap(add, constant('!'));
            expect(a$.get()).to.equal('a!!');
        });
    });
}
