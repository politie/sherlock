import { expect } from 'chai';
import { spy } from 'sinon';
import { pairwise, scan, struct } from '../extensions/sherlock-utils';
// import { fromObservable, toObservable } from '../extensions/sherlock-rxjs';
import { atom } from '../src';

describe('conversion', () => {
    /**
     * `@politie/sherlock` has the ability to produce and use Promises
     */
    describe('promises', () => {
        it('toPromise');
        it('fromPromise');
    });

    describe('RxJS', () => {
        it('toObservable');
        it('fromObservable');
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
            expect(pairwise).to.exist; // use `pairwise` so the import is used.

            const myCounter$ = atom(1);
            const reactSpy = spy();

            /**
             * **Your Turn**
             * Now, use `pairwise()`, to subtract the previous value from the current and call `reactSpy()` with this value.
             */

            expect(reactSpy).to.have.been.calledOnceWith(1);

            myCounter$.set(3);

            expect(reactSpy).to.have.been.calledTwice
                .and.calledWith(2);

            myCounter$.set(45);

            expect(reactSpy).to.have.been.calledThrice
                .and.calledWith(42);
        });

        /**
         * `scan` is the `Derivable` version of `Array.prototype.reduce`. It will be called with the current state and the last emitted value.
         *
         * *Note: as with `pairwise()` this is useable in both a `.derive()` and `.react()` method*
         */
        it('scan', () => {
            expect(scan).to.exist; // use `scan` so the import is used.

            const myCounter$ = atom(1);
            const reactSpy = spy();

            /**
             * **Your Turn**
             * Now, use `scan()`, to add all the emitted values together and call `reactSpy()` with this value.
             */


            expect(reactSpy).to.have.been.calledOnceWith(1);

            myCounter$.set(3);

            expect(reactSpy).to.have.been.calledTwice
                .and.calledWith(4);

            myCounter$.set(45);

            expect(reactSpy).to.have.been.calledThrice
                .and.calledWith(49);
        });

        /**
         * A `struct()` can combine an Object/Array of `Derivable`s into one `Derivable`, that contains the values of that `Derivable`.
         * The Object/Array that is in the output of `struct()` will have the same structure as the original Object/Array.
         *
         * This is best explained in practice.
         */
        it('struct', () => {
            expect(struct).to.exist;  // use `struct` so the import is used.

            const allMyAtoms = {
                regularProp: 'prop',
                string: atom('my string'),
                number: atom(1),
                sub: {
                    string: atom('my substring'),
                },
            };

            const myOneAtom$ = struct(allMyAtoms);

            expect(myOneAtom$.get()).to.have.property('string', 'my string');
            expect(myOneAtom$.get()).to.have.property('regularProp', 'prop');

            allMyAtoms.regularProp = 'new value';
            allMyAtoms.sub.string.set('my new substring');

            /**
             * **Your Turn**
             * Now have a look at the properties of `myOneAtom$`. Is this what you expect?
             */
            expect(myOneAtom$.get()).to.have;
        });
    });
});
