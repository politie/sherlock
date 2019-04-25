import { expect } from 'chai';
import { spy } from 'sinon';
import { atom } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

describe.skip('expert', () => {
    describe('`.autoCache()`', () => {
        /**
         * If a `.get()` is called on a `Derivable` all derivations will be executed.
         * But what if a `Derivable` is used multiple times in another `Derivable`.
         */
        it('multiple executions', () => {
            const hasDerived = spy();

            const myAtom$ = atom(true);
            const myFirstDerivation$ = myAtom$.derive(hasDerived);
            const mySecondDerivation$ = myFirstDerivation$.derive(() => myFirstDerivation$.get() + myFirstDerivation$.get());

            /**
             * **Your Turn**
             * `hasDerived` is used in the first derivation. But has it been called at this point?
             */
            expect(hasDerived).to.not.have.callCount(__YOUR_TURN__);

            mySecondDerivation$.get();

            /**
             * **Your Turn**
             * Now that we have gotten `mySecondDerivation$`, which calls `.get()` on the first multiple times.
             * How many times has the first `Derivable` actually executed it's derivation?
             */
            expect(hasDerived).to.have.callCount(__YOUR_TURN__); // how many times?
        });

        /**
         * So when a `Derivable` is reacting the value is cached and can be gotten from cache.
         * But if this `Derivable` is used multiple times in a row, even in another derivation it isn't cached.
         * To fix this issue, `.autoCache()` exists. It will cache the `Derivable`s value until the next Event Loop `tick`.
         *
         * So let's try the example above with this feature
         */
        it('autoCaching', async () => {
            const firstHasDerived = spy();
            const secondHasDerived = spy();

            /**
             * **Your Turn**
             * Use `.autoCache()` on one of the `Derivable`s below. To make the expectations pass.
             */
            const myAtom$ = atom(true);
            const myFirstDerivation$ = myAtom$.derive(firstHasDerived);
            const mySecondDerivation$ = myFirstDerivation$.derive(() => secondHasDerived(myFirstDerivation$.get() + myFirstDerivation$.get()));

            expect(firstHasDerived, 'first before .get()').to.have.not.been.called;
            expect(secondHasDerived, 'second before .get()').to.have.not.been.called;

            mySecondDerivation$.get();

            expect(firstHasDerived, 'first after first .get()').to.have.been.calledOnce;
            expect(secondHasDerived, 'second after first .get()').to.have.been.calledOnce;

            mySecondDerivation$.get();

            expect(firstHasDerived, 'first after second .get()').to.have.been.calledOnce;
            expect(secondHasDerived, 'second after second .get()').to.have.been.calledTwice;

            /**
             * Notice that the first `Derivable` has only been executed once, even though the second `Derivable` executed twice.
             * Now we wait a tick
             */

            await new Promise(r => setTimeout(r, 1));

            firstHasDerived.resetHistory();
            secondHasDerived.resetHistory();

            mySecondDerivation$.get();

            /**
             * **Your Turn**
             * Now what do you expect?
             */
            expect(firstHasDerived, 'first after last .get()').to.have.callCount(__YOUR_TURN__); // How many times was it called?
            expect(secondHasDerived, 'second after last .get()').to.have.callCount(__YOUR_TURN__); // How many times was it called?
        });
    });

    describe('`derivableCache`', () => { /** */ });
    describe('`controlFlow`', () => { /** */ });
});
