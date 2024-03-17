import { Map as ImmutableMap } from 'immutable';
import { atom, constant, Derivable, derive, SettableDerivable } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

describe.skip('advanced', () => {
    /**
     * In the case a `Derivable` is required, but the value is immutable.
     * You can use a `constant()`.
     *
     * This will create a readonly `Derivable`.
     */
    it('`constant`', () => {
        /**
         * We cast to `SettableDerivable` to trick TypeScript for this test.
         * It can be valuable to know what a `constant()` is, though.
         * So try and remove the `cast`, see what happens!
         */
        const c = constant('value') as unknown as SettableDerivable<string>;

        /**
         * **Your Turn**
         * What do you expect this `Derivable` to do on `.set()`, `.get()` etc?
         */
        expect(() => c.get()) // .toThrow() or .not.toThrow()?
        expect(() => c.set('new value')) // .toThrow() or .not.toThrow()?
    });

    /**
     * Collections in `ImmutableJS` are immutable, so any modification to a collection will create a new one.
     * This results in every change needing a `.get()` and a `.set()` on a `Derivable`.
     *
     * To make this pattern a little bit easier, the `.swap()` method can be used.
     * The given function will get the current value of the `Derivable` and any return value will be set as the new value.
     */
    it('`.swap()`', () => {
        // This is a separate function, because you might be able to use this later
        function plusOne(num: number) { return num + 1; }

        const myCounter$ = atom(0);
        /**
         * **Your Turn**
         * Rewrite the `.get()`/`.set()` combos below using `.swap()`.
         */
        myCounter$.set(plusOne(myCounter$.get()));
        expect(myCounter$.get()).toEqual(1);

        myCounter$.set(plusOne(myCounter$.get()));
        expect(myCounter$.get()).toEqual(2);
    });

    /**
     * As an alternative to `.get()` and `.set()`, there is also the `.value` accessor.
     */
    describe('.value', () => {
        /**
         * `.value` can be used as an alternative to `.get()` and `.set()`.
         * This helps when a property is expected instead of two methods.
         */
        it('as a getter/setter', () => {
            const myAtom$ = atom('foo');

            /**
             * **Your Turn**
             * Use the `.value` accessor to get the current value.
             */
            expect(__YOUR_TURN__).toEqual('foo');

            /**
             * **Your Turn**
             * Now use the `.value` accessor to set a 'new value'.
             */
            myAtom$.value = __YOUR_TURN__;

            expect(myAtom$.get()).toEqual('new value');
        });

        /**
         * If a `Derivable` is `unresolved`, `.get()` will normally throw.
         * `.value` will return `undefined` instead.
         */
        it('will not throw when `unresolved`', () => {
            const myAtom$ = atom.unresolved<string>();

            /**
             * **Your Turn**
             */
            expect(myAtom$.value).toEqual(__YOUR_TURN__);
        });

        /**
         * As a result, if `.value` is used inside a derivation, it will also replace `unresolved` with `undefined`.
         * So `unresolved` will not automatically propagate when using `.value`.
         */
        it('will stop propagation of `unresolved` in `.derive()`', () => {
            const myAtom$ = atom('foo');

            const usingGet$ = derive(() => myAtom$.get());
            const usingVal$ = derive(() => myAtom$.value);

            expect(usingGet$.get()).toEqual('foo');
            expect(usingVal$.get()).toEqual('foo');

            /**
             * **Your Turn**
             * We just created two `Derivable`s that are almost exactly the same.
             * But what happens when their source becomes `unresolved`?
             */
            expect(usingGet$.resolved).toEqual(__YOUR_TURN__);
            expect(usingVal$.resolved).toEqual(__YOUR_TURN__);
            myAtom$.unset();
            expect(usingGet$.resolved).toEqual(__YOUR_TURN__);
            expect(usingVal$.resolved).toEqual(__YOUR_TURN__);
        });
    });

    /**
     * The `.map()` method is comparable to `.derive()`.
     * But there are a couple of differences:
     * - It only triggers when the source `Derivable` changes
     * - It does not track any other `Derivable` used in the function
     * - It can be made to be settable
     */
    describe('`.map()`', () => {
        const mapReactSpy = jest.fn(val => val);
        // reset the spy before each test
        beforeEach(() => mapReactSpy.mockClear());

        it('triggers when the source changes', () => {
            const myAtom$ = atom(1);
            /**
             * **Your Turn**
             * Use the `.map()` method to create the expected output below
             */
            const mappedAtom$: Derivable<string> = __YOUR_TURN__;

            mappedAtom$.react(mapReactSpy);

            expect(mapReactSpy).toBeCalledTimes(1);
            expect(mapReactSpy).lastReturnedWith('1')

            myAtom$.set(3);

            expect(mapReactSpy).toBeCalledTimes(2);
            expect(mapReactSpy).lastReturnedWith('333')
        });

        it('does not trigger when any other `Derivable` changes', () => {
            const myRepeat$ = atom(1);
            const myString$ = atom('ho');
            const deriveReactSpy = jest.fn(val => val);

            // Note that the `.map` uses both `myRepeat$` and `myString$`
            myRepeat$.map(r => myString$.get().repeat(r)).react(mapReactSpy);
            myRepeat$.derive(r => myString$.get().repeat(r)).react(deriveReactSpy);

            expect(deriveReactSpy).toBeCalledTimes(1);
            expect(deriveReactSpy).lastReturnedWith('ho')
            expect(mapReactSpy).toBeCalledTimes(1);
            expect(mapReactSpy).lastReturnedWith('ho')

            myRepeat$.value = 3;
            /**
             * **Your Turn**
             * We changed`myRepeat$` to equal 3.
             * Do you expect both reactors to have fired? And with what?
             */
            expect(deriveReactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(deriveReactSpy).lastReturnedWith(__YOUR_TURN__)
            expect(mapReactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(mapReactSpy).lastReturnedWith(__YOUR_TURN__)

            myString$.value = 'ha';
            /**
             * **Your Turn**
             * And now that we have changed `myString$`? And when `myRepeat$` changed again?
             */
            expect(deriveReactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(deriveReactSpy).lastReturnedWith(__YOUR_TURN__)
            expect(mapReactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(mapReactSpy).lastReturnedWith(__YOUR_TURN__)

            myRepeat$.value = 2;
            expect(deriveReactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(deriveReactSpy).lastReturnedWith(__YOUR_TURN__)
            expect(mapReactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(mapReactSpy).lastReturnedWith(__YOUR_TURN__)

            /**
             * As you can see, a change in `myString$` will not trigger an update.
             * But if an update is triggered, `myString$` will be called and the new value will be used.
             */
        });

        /**
         * Since `.map()` is a relatively simple mapping of input value to output value.
         * It can often be reversed. In that case you can use that reverse mapping to create a `SettableDerivable`.
         */
        it('can be settable', () => {
            const myAtom$ = atom(1);

            /**
             * **Your Turn**
             */
            const myInverse$ = myAtom$.map(
                // This first function is called when getting
                n => n + 1,
                // The second is called when setting
                n => n - 1,
            );

            expect(myInverse$.get()).toEqual(2);

            myInverse$.set(4);

            /**
             * **Your Turn**
             */
            expect(myAtom$.get()).toEqual(__YOUR_TURN__);
            expect(myInverse$.get()).toEqual(__YOUR_TURN__);
        });
    });

    /**
     * `.pluck()` is a special case of the `.map()` method.
     * If a collection of values, like an Object, Map, Array is the result of a `Derivable` one of those values can be plucked into a new `Derivable`.
     * This plucked `Derivable` can be settable, if the source supports it.
     *
     * The way properties are plucked is pluggable, but by default both `<source>.get(<prop>)` and `<source>[<prop>]` are supported.
     * To support basic Objects, Maps and Arrays.
     *
     * *Note that normally when a value of a collection changes, the reference does not.*
     * *This means that setting a plucked property of a regular Object/Array/Map will not cause any reaction on that source `Derivable`.*
     * *ImmutableJS can help fix this problem*
     */
    describe('`.pluck()`', () => {
        const reactSpy = jest.fn(val => val);
        const reactPropSpy = jest.fn(val => val);
        let myMap$: SettableDerivable<ImmutableMap<string, string>>;
        let firstProp$: SettableDerivable<string>;

        // Reset
        beforeEach(() => {
            reactPropSpy.mockClear();
            reactSpy.mockClear();
            myMap$ = atom<ImmutableMap<string, string>>(ImmutableMap({
                firstProp: 'firstValue',
                secondProp: 'secondValue',
            }));
            /**
             * **Your Turn**
             * `.pluck()` 'firstProp' from `myMap$`.
             */
            firstProp$ = __YOUR_TURN__;
        });

        /**
         * Once a property is plucked in a new `Derivable`. This `Derivable` can be used as a regular `Derivable`.
         */
        it('can be used as a normal `Derivable`', () => {
            firstProp$.react(reactPropSpy, { skipFirst: true });

            /**
             * **Your Turn**
             * What do you expect the plucked `Derivable` to look like? And what happens when we `.set()` it?
             */
            expect(firstProp$.get()).toEqual(__YOUR_TURN__);

            firstProp$.set('other value');                       // the plucked `Derivable` should be settable
            expect(firstProp$.get()).toEqual(__YOUR_TURN__);     // is the `Derivable` value the same as was set?

            expect(reactPropSpy).toBeCalledTimes(__YOUR_TURN__); // how many times was the spy called? Note the `skipFirst`..
            expect(reactPropSpy).toReturnWith(__YOUR_TURN__);   // and what was the value?
        });

        /**
         * If the source of the plucked `Derivable` changes, the plucked `Derivable` will change as well.
         * As long as the change affects the plucked property of course.
         */
        it('will react to changes in the source `Derivable`', () => {
            firstProp$.react(reactPropSpy, { skipFirst: true });

            /**
             * **Your Turn**
             * We will set `secondProp`, will this affect `firstProp$`?
             */
            myMap$.swap(map => map.set('secondProp', 'new value'));
            expect(reactPropSpy).toBeCalledTimes(__YOUR_TURN__)   // how many times was the spy called?

            /**
             * **Your Turn**
             * And what if we set `firstProp`?
             */
            myMap$.swap(map => map.set('firstProp', 'new value'));
            expect(reactPropSpy).toBeCalledTimes(__YOUR_TURN__);  // how many times was the spy called?
            expect(reactPropSpy).lastReturnedWith(__YOUR_TURN__); // and with what value?
        });

        /**
         *
         */
        it('will write through to the source `Derivable`', () => {
            myMap$.react(reactSpy, { skipFirst: true });

            /**
             * **Your Turn**
             * So what if we set `firstProp$`? Does this propagate to the source `Derivable`?
             */
            firstProp$.set(__YOUR_TURN__);
            expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
            expect(myMap$.get()).toEqual(__YOUR_TURN__);
        });
    });
});
