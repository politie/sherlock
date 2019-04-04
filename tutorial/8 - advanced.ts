import { expect } from 'chai';
import { Map as ImmutableMap } from 'immutable';
import { spy } from 'sinon';
import { atom, constant, Derivable, SettableDerivable, derive } from '../src';

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
         * It can be valueable to know what a `constant()` is, though.
         * So try and remove the `cast`, see what happens!
         */
        const c = constant('value') as unknown as SettableDerivable<string>;

        /**
         * **Your Turn**
         * What do you expect this `Derivable` to do on `.set()`, `.get()` etc?
         */
        expect(c.get()).to;
        expect(() => c.set('new value')).to;
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
        expect(myCounter$.get()).to.equal(1);

        myCounter$.set(plusOne(myCounter$.get()));
        expect(myCounter$.get()).to.equal(2);
    });

    /**
     * We have seen `.get()` and `.set()` for `Derivable`s.
     * But there is another way to get and set a `Derivable`. This is through the `.value` property.
     *
     * This property is meant for two things.
     * - It helps when a settable property is expected instead of a methods
     * - It converts `unresolved` to `undefined`, so getting a property before it's resolved won't throw
     *
     * *Note that if used inside a derivation, this will also stop the propagation of `unresolved` of this `Derivable`*
     */
    it('`.value`', () => {
        const myAtom$ = atom.unresolved<string>();

        expect(myAtom$.value).to.be.undefined;

        /**
         * **Your Turn**
         * Use `.value` to set a new value. And in the following expectation
         */
        expect(__YOUR_TURN__).to.equal('a new value');


        /**
         * **Your Turn**
         * Any get on an `unresolved` `Derivable` will throw. We know that now.
         * And deriving with an `unresolved` `Derivable` will result in an `unresolved` `Derivable`.
         * But does the same happen if you derive using `.value`?
         */
        expect(() => derive(() => myAtom$.get()).get()).to.throw(__YOUR_TURN__);
        expect(() => derive(() => myAtom$.value).get()).to.throw(__YOUR_TURN__);


        /**
         * *Note: you may also want to look at `.getOr()` and `.fallbackTo()` for similar functionality*
         */
    });

    /**
     * The `.map()` method is comparable to `.derive()`.
     * But there are a couple of differences:
     * - It only triggers when the source `Derivable` changes
     * - It does not track any other `Derivable` used in the function
     * - It can be made to be settable
     */
    describe('`.map()`', () => {
        const reactSpy = spy();
        beforeEach('reset the spy', () => reactSpy.resetHistory());

        it('triggers when the source changes', () => {
            const myAtom$ = atom(1);
            /**
             * **Your Turn**
             * Use the `.map()` method to create the expected output below
             */
            let mappedAtom$!: Derivable<string>;

            mappedAtom$.react(reactSpy);

            expect(reactSpy).to.have.been.calledOnceWith('1');

            myAtom$.set(3);

            expect(reactSpy).to.have.been.calledTwice
                .and.calledWith('333');
        });

        it('does trigger when any other `Derivable` changes', () => {
            const myRepeat$ = atom(1);
            const myString$ = atom('ho');

            // Note that the `.map` uses both `myRepeat$` and `myString$`
            myRepeat$.map(r => myString$.get().repeat(r)).react(reactSpy);

            expect(reactSpy).to.have.been.calledOnceWith('ho');

            /**
             * **Your Turn**
             * Now let's change `myRepeat$`.
             * And check the `reactSpy`, is it what you would expect?
             */
            myRepeat$.value = 3;
            expect(reactSpy).to.have.been; // Was it called? And with what?

            /**
             * **Your Turn**
             * And now that we have changed `myString$`? And when `myRepeat$` changed again?
             */
            myString$.value = 'ha';
            expect(reactSpy).to.have.been; // Was it called? And with what?

            myRepeat$.value = 2;
            expect(reactSpy).to.have.been; // Was it called? And with what?

            /**
             * As you can see, a change in `myString$` will not trigger an update.
             * But if an update is triggered, `myString$` will be called and the new value will be used.
             */
        });

        /**
         * Since `.map()` is a relatively simple mapping of input value to output value.
         * It can often also be reversed. In that case you can use that reverse mapping to create a `SettableDerivable`.
         *
         */
        it('can be settable', () => {
            const myAtom$ = atom(1);

            /**
             * **Your Turn**
             */
            const myInverse$ = myAtom$.map(
                // This first function is called when getting
                n => -n,
                // The second is called when setting, you may want to fix this one though
                n => n,
            );

            expect(myInverse$.get()).to.equal(-1);

            myInverse$.set(-2);

            /**
             * **Your Turn**
             */
            expect(myAtom$.get()).to.equal; // What is the value of the `Atom`?
            expect(myInverse$.get()).to.equal(-2);
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
        const reactSpy = spy();
        const reactPropSpy = spy();
        let myMap$: SettableDerivable<ImmutableMap<string, string>>;
        let firstProp$: SettableDerivable<string>;

        beforeEach('reset', () => {
            reactPropSpy.resetHistory();
            reactSpy.resetHistory();
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
            expect(firstProp$.get()).to.equal(__YOUR_TURN__);

            firstProp$.set('other value');                        // the plucked `Derivable` should be settable
            expect(firstProp$.get()).to.equal(__YOUR_TURN__);     // is the `Derivable` value the same as was set?

            expect(reactPropSpy).to.have.callCount(__YOUR_TURN__) // how many times was the spy called? Note the `skipFirst`..
                .and.calledWith(__YOUR_TURN__);                   // and what was the value?
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
            expect(reactPropSpy).to.have.callCount(__YOUR_TURN__)   // how many times was the spy called?
                .and.calledWith(__YOUR_TURN__);                     // and with what value?

            /**
             * **Your Turn**
             * And what if we set `firstProp`?
             */
            myMap$.swap(map => map.set('firstProp', 'new value'));
            expect(reactPropSpy).to.have.callCount(__YOUR_TURN__)   // how many times was the spy called?
                .and.calledWith(__YOUR_TURN__);                     // and with what value?
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
            expect(reactSpy).to.have.callCount(__YOUR_TURN__)
            expect(myMap$.get()).to.equal(__YOUR_TURN__);
        });
    });
});
