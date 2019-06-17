import { assertSettable, Factory } from '../base-derivable.tests';
import { constant } from '../factories';

/**
 * Tests the `swap()` method.
 */
export function testSwap(factory: Factory) {
    describe('#swap', () => {
        it('should invoke the swap function with the current value and delegate the work to #set', () => {
            const a$ = assertSettable(factory('a'));

            jest.spyOn(a$, 'set');

            a$.swap(a => a + '!');
            expect(a$.set).toHaveBeenCalledTimes(1);
            expect(a$.set).toHaveBeenCalledWith('a!');
            expect(a$.get()).toBe('a!');
        });

        function add(a: string, b: string) { return a + b; }
        it('should pass any additional parameters to the swap function', () => {
            const a$ = assertSettable(factory('a'));

            a$.swap(add, '!');
            expect(a$.get()).toBe('a!');

            a$.swap(add, constant('!'));
            expect(a$.get()).toBe('a!!');
        });
    });
}
