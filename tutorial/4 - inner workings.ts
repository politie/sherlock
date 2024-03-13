import { expect } from 'chai';
import { Seq } from 'immutable';
import { spy } from 'sinon';
import { atom } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

/**
 * Time to dive a bit deeper into the inner workings of `@politie/sherlock`.
 */
describe.skip('inner workings', () => {
    /**
     * What if there is a derivation that reads from one of two `Derivable`s dynamically?
     * Will both of those `Derivable`s be tracked for changes?
     */
    it('dynamic/inactive dependencies', () => {
        const switch$ = atom(true);
        const number$ = atom(1);
        const string$ = atom('one');

        const reacted = spy();

        switch$
            // This `.derive()` is the one we are testing when true, it will return the `number` otherwise the `string`
            .derive(s => s ? number$.get() : string$.get())
            .react(reacted);

        // The first time should not surprise anyone, the derivation was called and returned the right result
        expect(reacted).to.have.been.calledOnceWith(1);

        // `switch$` is still set to true (number)
        string$.set('two');

        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);
        expect(reacted.lastCall).to.be.calledWith(__YOUR_TURN__);

        // `switch$` is still set to true (number)
        number$.set(2);

        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);
        expect(reacted.lastCall).to.be.calledWith(__YOUR_TURN__);

        // Now let's reset the spy, so callCount should be 0 again.
        reacted.resetHistory();

        // `switch$` is set to false (string)
        switch$.set(false);
        number$.set(3);

        /**
         * **Your Turn**
         * What do you expect now?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);
        expect(reacted.lastCall).to.be.calledWith(__YOUR_TURN__);
    });

    /**
     * One thing to know about `Derivable`s is that derivations are not executed, until someone asks.
     * So let's test this.
     */
    it('lazy execution', () => {
        const hasDerived = spy();

        const myAtom$ = atom(true);
        const myDerivation$ = myAtom$.derive(hasDerived);

        /**
         * **Your Turn**
         * We have created a new `Derivable` by deriving the `Atom`. But have not called `.get()` on that new `Derivable`.
         * Do you think the `hasDerived` function has been called? And how many times?
         *
         * *Hint: you can use sinonChai's `.to.have.been.called`/`.to.have.been.calledOnce`/`to.have.callCount(...)`/etc..*
         */
        expect(hasDerived).to.have.callCount(__YOUR_TURN__); // Well, what do you expect?

        myDerivation$.get();

        expect(hasDerived).to.have.callCount(__YOUR_TURN__); // And after a `.get()`?

        myDerivation$.get();

        expect(hasDerived).to.have.callCount(__YOUR_TURN__); // And after the second `.get()`? Is there an extra call?

        /**
         * The state of any `Derivable` can change at any moment.
         * But you don't want to keep a record of the state and changes to a `Derivable` that no one is listening to.
         * That's why a `Derivable` has to recalculate it's internal state every time `.get()` is called. There is however
         * an exception to this rule (see next test)
         */
    });

    /**
     * So what if the `Derivable` is reacting?
     * When a `Derivable` is reacting, the current state is known.
     * And since changes are derived/reacted to synchronously, the state is always up to date.
     * So a `.get()` should not have to be calculated.
     */
    it('while reacting', () => {
        const hasDerived = spy();

        const myAtom$ = atom(true);
        const myDerivation$ = myAtom$.derive(hasDerived);

        // It should not have done anything at this moment
        expect(hasDerived).to.not.have.been.called;

        const stopper = myDerivation$.react(() => '');

        /**
         * **Your Turn**
         * Ok, it's your turn to complete the expectations.
         * *Hint: you can use `.calledOnce`/`.calledTwice` etc or `.callCount()`*
         */
        expect(hasDerived).to.have.callCount(__YOUR_TURN__);

        myDerivation$.get();

        expect(hasDerived).to.have.callCount(__YOUR_TURN__);

        myAtom$.set(false);

        expect(hasDerived).to.have.callCount(__YOUR_TURN__);

        myDerivation$.get();

        expect(hasDerived).to.have.callCount(__YOUR_TURN__);

        stopper();

        expect(hasDerived).to.have.callCount(__YOUR_TURN__);

        myDerivation$.get();

        expect(hasDerived).to.have.callCount(__YOUR_TURN__);

        /**
         * Since the `.react()` already listens to the value(changes) there is no need to recalculate whenever a `.get()` is called.
         * But when the reactor has stopped, the derivation has to be calculated again.
         */
    });

    /**
     * The basics of `Derivable` caching are seen above.
     * But there is one more trick up it's sleeve.
     */
    it('cached changes', () => {
        const first = spy();
        const second = spy();

        const myAtom$ = atom(1);
        const first$ = myAtom$.derive(i => {
            first(i); // Call the spy, to let it know we were here
            return i > 2;
        });
        const second$ = first$.derive(second);

        // As always, they should not have fired yet
        expect(first).to.not.have.been.called;
        expect(second).to.not.have.been.called;

        second$.react(() => '');

        // And as expected, they now should both have fired once
        expect(first).to.have.been.calledOnce;
        expect(second).to.have.been.calledOnce;

        /**
         * **Your Turn**
         * But what to expect now?
         */
        myAtom$.set(1); // Note that this is the same value as it was initialized with

        expect(first).to.have.callCount(__YOUR_TURN__);
        expect(second).to.have.callCount(__YOUR_TURN__);

        myAtom$.set(2);

        expect(first).to.have.callCount(__YOUR_TURN__);
        expect(second).to.have.callCount(__YOUR_TURN__);

        myAtom$.set(3);

        expect(first).to.have.callCount(__YOUR_TURN__);
        expect(second).to.have.callCount(__YOUR_TURN__);

        myAtom$.set(4);

        expect(first).to.have.callCount(__YOUR_TURN__);
        expect(second).to.have.callCount(__YOUR_TURN__);

        /**
         * Can you explain the behavior above?
         *
         * It is why we say that `@politie/sherlock` deals with reactive state and not events (as RxJS does for example).
         * Events can be very useful, but when data is involved, you are probably only interested in value changes.
         * So these changes can and need to be cached and deduplicated.
         */
    });

    /**
     * So if the new value of a `Derivable` is equal to the old, it won't propagate a new event.
     * But what does it mean to be equal in a `Derivable`.
     *
     * Strict `===` equality would mean that `NaN` and `NaN` would not even be equal.
     * `Object.is()` equality would be better, but would mean that structurally equal objects could be different.
     */
    it('equality', () => {
        const atom$ = atom<unknown>({});
        const hasReacted = spy();

        atom$.react(hasReacted, { skipFirst: true });

        atom$.set({});

        /**
         * **Your Turn**
         * The `Atom` is set with exactly the same object as before. Will the `.react()` fire?
         */
        expect(hasReacted).to.have.callCount(__YOUR_TURN__);

        /**
         * But what if you use an object, that can be easily compared through a library like `ImmutableJS`
         * Let's try an `Immutable.Seq`
         */
        atom$.set(Seq.Indexed.of(1, 2, 3));
        // Let's reset the spy here, to start over
        hasReacted.resetHistory();
        expect(hasReacted).to.not.have.been.called;

        atom$.set(Seq.Indexed.of(1, 2, 3));
        /**
         * **Your Turn**
         * Do you think the `.react()` fired with this new value?
         */
        expect(hasReacted).to.have.callCount(__YOUR_TURN__);

        atom$.set(Seq.Indexed.of(1, 2));

        /**
         * **Your Turn**
         * And now?
         */
        expect(hasReacted).to.have.callCount(__YOUR_TURN__);

        /**
         * In `@politie/sherlock` equality is a bit complex.
         * First we check `Object.is()` equality, if that is true, it is the same, you can't deny that.
         * After that it is pluggable. It can be anything you want.
         * By default we try to use `.equals()`, to support libraries like `ImmutableJS`.
         */
    });

    /**
     * What if there is a derivation that reads from one of two `Derivable`s dynamically?
     * Will both of those `Derivable`s be tracked for changes?
     */
    it('dynamic/inactive dependencies', () => {
        const switch$ = atom(true);
        const number$ = atom(1);
        const string$ = atom('one');

        const reacted = spy();

        switch$
            // This `.derive()` is the one we are testing when true, it will return the `number` otherwise the `string`
            .derive(s => s ? number$.get() : string$.get())
            .react(reacted);

        // The first time should not surprise anyone, the derivation was called and returned the right result
        expect(reacted).to.have.been.calledOnceWith(1);

        // `switch$` is still set to true (number)
        string$.set('two');

        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);

        // `switch$` is still set to true (number)
        number$.set(2);

        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);

        // Now let's reset the spy, so callCount should be 0 again.
        reacted.resetHistory();

        // `switch$` is set to false (string)
        switch$.set(false);
        /**
         * **Your Turn**
         * What do you expect?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);

        number$.set(3);

        /**
         * **Your Turn**
         * What do you expect now?
         */
        expect(reacted).to.have.callCount(__YOUR_TURN__);
    });
});
