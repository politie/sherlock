import { atom } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

/**
 * Welcome to the `@politie/sherlock` tutorial.
 *
 * It is set up as a collection of specs, with the goal of getting all the specs to pass.
 * The `expect()`s and basic setup are there, you just need to get it to work.
 *
 * All specs except the first one are set to `.skip`. Remove this to start on that part of the tutorial.
 *
 * Start the tutorial by running: `npm run tutorial`.
 *
 * *Hint: most methods and functions are fairly well documented in jsDoc, which is easily accessed through TypeScript*
 */
describe.skip('intro', () => {
    it('should be clear what to do next', () => {
        // At the start of the spec, there will be some setup.
        let bool = false;
        // Sometimes including an expectation, to show the current state.
        expect(bool).toBe(false);

        /**
         * If **Your Turn** is shown in a comment, there is work for you to do.
         * This can also be indicated with the `__YOUR_TURN__` variable.
         * It should be clear what to do here...
         */
        bool = __YOUR_TURN__;

        // We use expectations like this to verify the result.
        expect(bool).toBe(true);
    });
});

/**
 * Let's start with the `Derivable` basics.
 */
describe.skip('the basics', () => {
    /**
     * The `Atom` is the basic building block of `@politie/sherlock`.
     * It holds a value which you can `get()` and `set()`.
     */
    it('the `Atom`', () => {
        // An `Atom` can be created with the `atom()` function. The parameter of this function is used as the initial value of the `Atom`.
        const myValue$ = atom(1);
        // Variables containing `Atom`s or any other `Derivable` are usually postfixed with a `$` to indicate this. Hence `myValue$`.

        // The `.get()` method can be used to get the current value of the `Atom`.
        expect(myValue$.get()).toEqual(1);

        /**
         * **Your Turn**
         * Use the `.set(<newValue>)` method to change the value of the `Atom`.
         */

        expect(myValue$.get()).toEqual(2);
    });

    /**
     * The `Atom` is a `Derivable`. This means it can be used to create a derived value.
     * This derived value stays up to date with the original `Atom`.
     *
     * The easiest way to do this, is to call `.derive()` on another `Derivable`.
     * Let's try this.
     */
    it('the `Derivable`', () => {
        const myValue$ = atom(1);
        expect(myValue$.get()).toEqual(1);

        /**
         * **Your Turn**
         * We want to create a new `Derivable` that outputs the inverse of the original `Atom`.
         * Use `myValue$.derive(val => ...)` to create the `myInverse$` variable.
         */
        const myInverse$ = myValue$.derive(__YOUR_TURN__);

        expect(myInverse$.get()).toEqual(-1);

        // So if we set `myValue$` to -2:
        myValue$.set(-2);
        // `myInverse$` will change accordingly.
        expect(myInverse$.get()).toEqual(2);
    });

    /**
     * Of course, `Derivable`s are not only meant to get, set and derive state.
     * You can also listen to the changes.
     *
     * This is done with the `.react()` method.
     * This method is given a `function` that is executed every time the value of the `Derivable` changes.
     */
    it('reacting to `Derivable`s', () => {
        const myCounter$ = atom(0);

        let reacted = 0;
        /**
         * **Your Turn**
         * Now react to `myCounter$`. In every `react()`, increase the `reacted` variable by one.
         */

        expect(reacted).toEqual(1); // `react()` will react immediately, more on that later.

        // And then we set the `Atom` a couple of times to make the `Derivable` react.
        for (let i = 0; i <= 100; i++) {
            // Set the value of the `Atom`.
            myCounter$.set(i);
        }
        expect(reacted).toEqual(101);
    });
});
