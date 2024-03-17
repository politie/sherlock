import { atom, Derivable, DerivableAtom } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

/**
 * Sometimes your data isn't available yet. For example if it is still being fetched from the server.
 * At that point you probably still want your `Derivable` to exist, to start deriving and reacting when the data becomes available.
 *
 * To support this, `Derivable`s in `@politie/sherlock` support a separate state, called `unresolved`.
 * This indicates that the data is not available yet, but (probably) will be at some point.
 */
describe.skip('unresolved', () => {
    /**
     * Let's start by creating an `unresolved` `Derivable`.
     */
    it('can be checked on the `Derivable`', () => {
        // By using the `.unresolved()` method, you can create an `unresolved` atom
        // Note that you will need to indicate the type of this atom, since it can't be inferred by TypeScript this way.
        const myAtom$ = atom.unresolved<number>();

        expect(myAtom$.resolved).toEqual(__YOUR_TURN__);

        /**
         * **Your Turn**
         * Resolve the atom, it's pretty easy
         */

        expect(myAtom$.resolved).toBe(true);
    });

    /**
     * An `unresolved` `Derivable` is not able to provide a value yet.
     * So `.get()` will throw if you try.
     */
    it('cannot `.get()`', () => {
        /**
         * **Your Turn**
         * Time to create an `unresolved` Atom..
         */
        const myAtom$: DerivableAtom<string> = __YOUR_TURN__;

        expect(myAtom$.resolved).toBe(false);
        expect(() => myAtom$.get()).toThrow('Could not get value, derivable is unresolved');

        myAtom$.set('finally!');

        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(myAtom$.resolved).toEqual(__YOUR_TURN__);
        expect(() => myAtom$.get()) // .toThrow() or .not.toThrow();
    });

    /**
     * If a `Derivable` is `unresolved` it can't react yet. But it will `.react()` if a value becomes available.
     *
     * *Note that this can prevent `.react()` from executing immediately*
     */
    it('reacting to `unresolved`', () => {
        const myAtom$ = atom.unresolved<string>();

        const hasReacted = jest.fn(val => val);
        myAtom$.react(hasReacted);

        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(hasReacted).toBeCalledTimes(__YOUR_TURN__)

        /**
         * **Your Turn**
         * Now make the last expect succeed
         */

        expect(myAtom$.resolved).toBe(true);
        expect(hasReacted).toBeCalledTimes(1)
        expect(hasReacted).lastReturnedWith(`woohoow, I was called`);
    });

    /**
     * In `@politie/sherlock` there is no reason why a `Derivable` should not become `unresolved` again,
     * after it has been set.
     */
    it('can become `unresolved` again', () => {
        const myAtom$ = atom.unresolved<string>();

        expect(myAtom$.resolved).toBe(false);

        /**
         * **Your Turn**
         * Set the value..
         */

        expect(myAtom$.get()).toEqual(`it's alive!`);

        /**
         * **Your Turn**
         * Unset the value.. (*Hint: TypeScript is your friend*)
         */

        expect(myAtom$.resolved).toBe(false);
    });

    /**
     * When a `Derivable` is dependent on another `unresolved` `Derivable`, this `Derivable` should also become `unresolved`.
     *
     * *Note that this will only become `unresolved` when there is an active dependency (see 'inner workings#dynamic dependencies')*
     */
    it('will propagate', () => {
        const myString$ = atom.unresolved<string>();
        const myOtherString$ = atom.unresolved<string>();

        /**
         * **Your Turn**
         * Combine the two `Atom`s into one `Derivable`
         */
        const myDerivable$: Derivable<string> = __YOUR_TURN__;

        /**
         * **Your Turn**
         * Is `myDerivable$` expected to be `resolved`?
         */
        expect(myDerivable$.resolved).toEqual(__YOUR_TURN__);

        // Now let's set one of the two source `Atom`s
        myString$.set('some');

        /**
         * **Your Turn**
         * What do you expect to see in `myDerivable$`.
         * And what if we set `myOtherString$`?
         */
        expect(myDerivable$.resolved).toEqual(__YOUR_TURN__);
        myOtherString$.set('data');
        expect(myDerivable$.resolved).toEqual(__YOUR_TURN__);
        expect(myDerivable$.get()).toEqual(__YOUR_TURN__);

        /**
         * **Your Turn**
         * Now we will unset one of the `Atom`s.
         * What do you expect `myDerivable$` to be?
         */
        myString$.unset();
        expect(myDerivable$.resolved).toEqual(__YOUR_TURN__);
    });
});
