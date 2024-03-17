import { pairwise, scan, struct } from '../extensions/sherlock-utils';
import { atom } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

describe.skip('conversion', () => {
    /**
     * `@politie/sherlock` has the ability to produce and use Promises
     */
    describe('promises', () => {
        it('toPromise', () => {});
        it('fromPromise', () => {});
    });

    describe('RxJS', () => {
        it('toObservable', () => {});
        it('fromObservable', () => {});
    });

    /**
     * In the `@politie/sherlock-utils` lib, there are a couple of functions that can combine multiple values of a single `Derivable`
     * or combine multiple `Derivable`s into one. We will show a couple of those here.
     */
    describe.skip('utils', () => {
        /**
         * As the name suggests, `pairwise()` will call the given function with both the current and the previous state.
         *
         * *Note functions like `pairwise` and `scan` can be used with any callback. So it can be used both in a `.derive()` step and in a `.react()`*
         */
        it('pairwise', () => {
            expect(pairwise).toBeDefined(); // use `pairwise` so the import is used.

            const myCounter$ = atom(1);
            const reactSpy = jest.fn(val => val);

            /**
             * **Your Turn**
             * Now, use `pairwise()`, to subtract the previous value from the current
             */
            myCounter$.derive(__YOUR_TURN__).react(reactSpy);

            expect(reactSpy).toBeCalledTimes(1);
            expect(reactSpy).lastReturnedWith(1);

            myCounter$.set(3);

            expect(reactSpy).toBeCalledTimes(2);
            expect(reactSpy).lastReturnedWith(2);

            myCounter$.set(45);

            expect(reactSpy).toBeCalledTimes(3);
            expect(reactSpy).lastReturnedWith(42);
        });

        /**
         * `scan` is the `Derivable` version of `Array.prototype.reduce`. It will be called with the current state and the last emitted value.
         *
         * *Note: as with `pairwise()` this is useable in both a `.derive()` and `.react()` method*
         */
        it('scan', () => {
            expect(scan).toBeDefined; // use `scan` so the import is used.

            const myCounter$ = atom(1);
            const reactSpy = jest.fn(val => val);

            /**
             * **Your Turn**
             * Now, use `scan()`, to add all the emitted values together
             */
            myCounter$.derive(__YOUR_TURN__).react(reactSpy);

            expect(reactSpy).toBeCalledTimes(1);
            expect(reactSpy).lastReturnedWith(1);

            myCounter$.set(3);

            expect(reactSpy).toBeCalledTimes(2);
            expect(reactSpy).lastReturnedWith(4);

            myCounter$.set(45);

            expect(reactSpy).toBeCalledTimes(3);
            expect(reactSpy).lastReturnedWith(49);

            /**
             * *BONUS: Try using `scan()` (or `pairwise()`) directly in the `.react()` method.*
             */
        });

        /**
         * A `struct()` can combine an Object/Array of `Derivable`s into one `Derivable`, that contains the values of that `Derivable`.
         * The Object/Array that is in the output of `struct()` will have the same structure as the original Object/Array.
         *
         * This is best explained in practice.
         */
        it('struct', () => {
            expect(struct).toBeDefined;  // use `struct` so the import is used.

            const allMyAtoms = {
                regularProp: 'prop',
                string: atom('my string'),
                number: atom(1),
                sub: {
                    string: atom('my substring'),
                },
            };

            const myOneAtom$ = struct(allMyAtoms);

            expect(myOneAtom$.get()).toEqual({
                regularProp: 'prop',
                string: 'my string',
                number: 1,
                sub: {
                    string: 'my substring',
                },
            });

            allMyAtoms.regularProp = 'new value';
            allMyAtoms.sub.string.set('my new substring');

            /**
             * **Your Turn**
             * Now have a look at the properties of `myOneAtom$`. Is this what you expect?
             */
            expect(myOneAtom$.get()).toEqual({
                regularProp: __YOUR_TURN__,
                string: __YOUR_TURN__,
                number: __YOUR_TURN__,
                sub: {
                    string: __YOUR_TURN__,
                },
            });
        });
    });
});
