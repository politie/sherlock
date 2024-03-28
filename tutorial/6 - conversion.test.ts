import { fromPromise, pairwise, scan, struct } from '../extensions/sherlock-utils';
import { fromObservable, toObservable } from '../extensions/sherlock-rxjs';

import { Derivable, atom } from '../src';
import { Subject } from 'rxjs';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

describe('conversion', () => {
    /**
     * `@politie/sherlock` has the ability to produce and use Promises
     */
    describe('promises', () => {
        it('toPromise', done => {
            const myAtom$ = atom.unresolved<number>();
            const myAtomPromise = myAtom$.toPromise();

            /**
             * **Your Turn**
             * How many times will expect be called?
             */
            expect.assertions(1);
            myAtomPromise.then(value => {
                /**
                 * **Your Turn**
                 * What do you expect the value to be?
                 */
                expect(value).toBe(1);
            }).finally(() => {
                done();
            })
            myAtom$.set(1);
            myAtom$.set(2);
            /**
             * Note: After a value is set on the atom the promise resolves, consecutive setters have no impact on the promise.
             * If you want to listen to subsequent updates, use toObservable instead of toPromise.
             */
        });

        it('fromPromise', async () => {
            const promise = Promise.resolve(123);
            const promiseDerivable$: Derivable<number> = fromPromise(promise);

            expect(promiseDerivable$.resolved).toBe(false);
            expect(promiseDerivable$.final).toBe(false);

            await promise;
            /**
             * **Your Turn**
             * What do you expect the value to be and is the Derivable now in the final state?
             */
            expect(promiseDerivable$.get()).toBe(123);
            expect(promiseDerivable$.final).toBe(true);
        });
    });

    /**
     * `@politie/sherlock` has the ability to produce and use RxJS observables
     */
    describe('RxJS', () => {
        it('toObservable', () => {
            let currentValue = 0;
            let complete = false;
            const myAtom$ = atom(1);
            toObservable<number>(myAtom$).subscribe({
                next: (value) => currentValue = value,
                complete: () => complete = true
            });

            /**
             * **Your Turn**
             * What do you expect the currentValue to be and has the observable completed already?
             */
            expect(currentValue).toBe(1);
            expect(complete).toBe(false);

            myAtom$.set(2);
            /**
             * **Your Turn**
             * What do you expect the currentValue to be and has the observable completed already?
             */
            expect(currentValue).toBe(2);
            expect(complete).toBe(false);

            myAtom$.setFinal(3);
            /**
             * **Your Turn**
             * What do you expect the currentValue to be and has the observable completed already?
             */
            expect(currentValue).toBe(3);
            expect(complete).toBe(true);
        });

        /**
         * toObservable supports same options as react such as from, until, when, skipFirst, and once.
         */
        it('toObservable supports options', () => {
            const myAtom$ = atom('a');
            let complete = false;
            const values: string[] = [];
            toObservable<string>(myAtom$, { skipFirst: true, once: true }).subscribe({
                next: value => values.push(value),
                complete: () => complete = true
            });
            /**
             * **Your Turn**
             * What do you expect values to contain and has the observable completed already?
             */
            expect(values).toEqual([]);
            expect(complete).toBe(false);

            myAtom$.set('b');
            /**
             * **Your Turn**
             * What do you expect values to contain and has the observable completed already?
             */
            expect(values).toEqual(['b']);
            expect(complete).toBe(true);

            myAtom$.set('c');
            /**
             * **Your Turn**
             * What do you expect values to contain and has the observable completed already?
             */
            expect(values).toEqual(['b']);
            expect(complete).toBe(true);
        });

        it('fromObservable', () => {
            let currentValue = 0;
            const subject$ = new Subject<number>();
            const derivable$: Derivable<number> = fromObservable(subject$);

            derivable$.react((value => currentValue = value), { until: (value) => value.get() > 2 });
            expect(derivable$.resolved).toBe(false)
            /**
             * Additional challenge: What do you have to do in the setup to make sure the derivable$ is resolved?
             * Hint: React runs immediately after creation but it needs to receive a value from the
             * observable Subject.
             */

            subject$.next(1);
            /**
             * **Your Turn**
             * What do you expect the currentValue is and is the derivable$ resolved?
             */
            expect(derivable$.resolved).toBe(true);
            expect(currentValue).toBe(1);

            subject$.next(2);
            /**
             * **Your Turn**
             * What do you expect values to contain and has the observable completed already?
             */
            expect(currentValue).toBe(2);

            subject$.next(3);
            /**
             * **Your Turn**
             * What do you expect values to contain and has the observable completed already?
             */
            expect(currentValue).toBe(2);
        });
    });

    /**
     * In the `@politie/sherlock-utils` lib, there are a couple of functions that can combine multiple values of a single `Derivable`
     * or combine multiple `Derivable`s into one. We will show a couple of those here.
     */
    describe('utils', () => {
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
            myCounter$.derive(pairwise((newValue, oldValue) => oldValue ? newValue - oldValue : newValue)).react(reactSpy);

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
            myCounter$.derive(scan((total, value) => total += value, 0)).react(reactSpy);

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
                regularProp: 'new value',
                string: 'my string',
                number: 1,
                sub: {
                    string: 'my new substring',
                },
            });
        });
    });
});
