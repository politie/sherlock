import { derivableCache } from '../extensions/sherlock-utils';
import { atom, DerivableAtom, derive } from '../src';

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
            const hasDerived = jest.fn();

            const myAtom$ = atom(true);
            const myFirstDerivation$ = myAtom$.derive(hasDerived);
            const mySecondDerivation$ = myFirstDerivation$.derive(() => myFirstDerivation$.get() + myFirstDerivation$.get());

            /**
             * **Your Turn**
             * `hasDerived` is used in the first derivation. But has it been called at this point?
             */
            expect(hasDerived).toBeCalledTimes(__YOUR_TURN__);

            mySecondDerivation$.get();

            /**
             * **Your Turn**
             * Now that we have gotten `mySecondDerivation$`, which calls `.get()` on the first multiple times.
             * How many times has the first `Derivable` actually executed it's derivation?
             */
            expect(hasDerived).toBeCalledTimes(__YOUR_TURN__); // how many times?
        });

        /**
         * So when a `Derivable` is reacting the value is cached and can be gotten from cache.
         * But if this `Derivable` is used multiple times in a row, even in another derivation it isn't cached.
         * To fix this issue, `.autoCache()` exists. It will cache the `Derivable`s value until the next Event Loop `tick`.
         *
         * So let's try the example above with this feature
         */
        it('autoCaching', async () => {
            const firstHasDerived = jest.fn();
            const secondHasDerived = jest.fn();

            /**
             * **Your Turn**
             * Use `.autoCache()` on one of the `Derivable`s below. To make the expectations pass.
             */
            const myAtom$ = atom(true);
            const myFirstDerivation$ = myAtom$.derive(firstHasDerived);
            const mySecondDerivation$ = myFirstDerivation$.derive(() => secondHasDerived(myFirstDerivation$.get() + myFirstDerivation$.get()));

            expect(firstHasDerived).toBeCalledTimes(0);     // first before .get()
            expect(secondHasDerived).toBeCalledTimes(0);    // second before .get()

            mySecondDerivation$.get();

            expect(firstHasDerived).toBeCalledTimes(1);     // first after first .get()
            expect(secondHasDerived).toBeCalledTimes(1);    // second after first .get()

            mySecondDerivation$.get();

            expect(firstHasDerived).toBeCalledTimes(1);     // first after second .get()
            expect(secondHasDerived).toBeCalledTimes(2);    // second after second .get()

            /**
             * Notice that the first `Derivable` has only been executed once, even though the second `Derivable` executed twice.
             * Now we wait a tick
             */

            await new Promise(r => setTimeout(r, 1));

            firstHasDerived.mockClear();
            secondHasDerived.mockClear();

            mySecondDerivation$.get();

            /**
             * **Your Turn**
             * Now what do you expect?
             */
            expect(firstHasDerived).toBeCalledTimes(__YOUR_TURN__);  // How many times was it called?
            expect(secondHasDerived).toBeCalledTimes(__YOUR_TURN__); // How many times was it called?
        });
    });

    /**
     * Some `Derivable`s need an input to be calculated. If this `Derivable` is async or has a big setup process,
     * you may still want to create it only once, even if the `Derivable` is requested more than once for the same resource.
     *
     * Let's imagine a `stockPrice$(stock: string)` function, which returns a `Derivable` with the current price for the given stock.
     * This `Derivable` is async, since it will try to retrieve the current price on a distant server.
     *
     * Let's see what can go wrong first, and we will try to fix it after that.
     *
     * *Note that a `Derivable` without an input is (hopefully) created only once, so it does not have this problem*
     */
    describe('`derivableCache`', () => {
        type Stocks = 'GOOGL' | 'MSFT' | 'APPL';
        let stockPrice$: jest.Mock<DerivableAtom<number>>;
        beforeEach(() => stockPrice$ = jest.fn(() => atom.unresolved()));

        const reactSpy = jest.fn(val => val);
        beforeEach(() => reactSpy.mockClear());
        // function reactor(v: any) { reactSpy(v); }

        /**
         * If the function to create the `Derivable` is called multiple times, the `Derivable` will be created multiple times.
         * Any setup this `Derivable` does, will be executed every time.
         */
        it('multiple setups', () => {
            // To not make things difficult with `unresolved` for this example, imagine we get a response synchronously
            stockPrice$.mockReturnValue(atom(1079.11));

            const html$ = derive(() => `
                <h1>Alphabet Price ($${stockPrice$('GOOGL').get().toFixed(2)})</h1>
                <p>Some important text that uses the current price ($${stockPrice$('GOOGL').get().toFixed()}) as well</p>
            `);
            html$.react(reactSpy);

            expect(html$.connected).toBe(true);
            expect(reactSpy).toBeCalledTimes(1);

            /**
             * **Your Turn**
             * The `Derivable` is connected and has emitted once, but in that value the 'GOOGL' stockprice was displayed twice.
             * We know that using a `Derivable` twice in a connected `Derivable` will make the second `.get()` use a cached value.
             *
             * But does that apply here?
             * How many times has the setup run, for the price `Derivable`.
             */
            expect(stockPrice$).toBeCalledTimes(__YOUR_TURN__);

            /** Can you explain this behavior? */
        });

        /**
         * An other problem can arise when the setup is done inside a derivation
         */
        describe('setup inside a derivation', () => {
            /**
             * When the setup of a `Derivable` is done inside the same derivation as where `.get()` is called.
             * You may be creating some problems.
             */
            it('unresolvable values', () => {
                // First setup an `Atom` with the company we are currently interested in
                const company$ = atom<Stocks>('GOOGL');

                // Based on that `Atom` we derive the stockPrice
                const price$ = company$.derive(company => stockPrice$(company).get());

                price$.react(reactSpy);

                // Because the stockPrice is still `unresolved` the reactor should not have emitted anything yet
                expect(reactSpy).toBeCalledTimes(0);
                expect(stockPrice$).toBeCalledTimes(1);

                // Now let's set the price
                // First we have to get the atom that was given by the `stockPrice$` stub
                const googlPrice$ = stockPrice$.mock.results[0].value;
                // Check if it is the right `Derivable`
                expect(googlPrice$.connected).toBe(true);

                // Then we set the price
                googlPrice$.set(1079.11);

                /**
                 * **Your Turn**
                 * So the value was set. What do you think happened?
                 */
                expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
                // And how many times did the setup run?
                expect(stockPrice$).toBeCalledTimes(__YOUR_TURN__);
                expect(googlPrice$.connected).toBe(__YOUR_TURN__);

                /**
                 * Can you explain this behavior?
                 *
                 * Thought about it? Here is what happened:
                 * -  Initially `stockPrice$('GOOGL')` emits a `Derivable` (`googlPrice$`), which is unresolved
                 * -  Inside the `.derive()` we subscribe to updates on that `Derivable`
                 * -  When `googlPrice$` emits a new value, the `.derive()` step is run again
                 * -  Inside this step, the setup is run again and a new `Derivable` (`newGooglPrice$`) is created and subscribed to
                 * -  Unsubscribing from the old `googlPrice$`
                 *
                 * This `newGooglPrice$` is newly created and `unresolved` again. So the end result is an `unresolved` `price$` `Derivable`.
                 */
            });

            /**
             * **Bonus**
             *
             * The problem above can be fixed without a `derivableCache`.
             * If we split the `.derive()` step into two steps, where the first does the setup, and the second unwraps the `Derivable` created in the first.
             * This way, a newly emitted value from the created `Derivable` will not run the setup again and everything should work as expected.
             *
             * **Your Turn**
             *
             * *Hint: there is even an `unwrap` helper function for just such an occasion, try it!*
             */

            /**
             * But even when you split the setup and the `unwrap`, you may not be out of the woods yet!
             * This is actually a problem that most libraries have a problem with, if not properly accounted for.
             */
            it('uncached Derivables', () => {
                // First we setup an `Atom` with the company we are currently interested in
                // This time we support multiple companies, though
                const companies$ = atom<Stocks[]>(['GOOGL']);

                // Based on that `Atom` we derive the stockPrices
                const prices$ = companies$
                    /**
                     * There is no need derive anything here, so we use `.map()` on `companies$`
                     * And since `companies` is an array of strings, we `.map()` over that array to create an array of `Derivable`s
                     */
                    .map(companies => companies.map(company => stockPrice$(company)))
                    // Then we get the prices from the created `Derivable`s in a separate step
                    .derive(price$s => price$s.map(price$ => price$.value));

                prices$.react(reactSpy);

                // Because we use `.value` instead of `.get()` the reactor should emit immediately, this time
                expect(reactSpy).toBeCalledTimes(1);
                // But it should emit `undefined`
                expect(reactSpy).lastReturnedWith([undefined])

                // Now let's increase the price
                // First we have to get the atom that was given by the `stockPrice$` stub
                const googlPrice$ = stockPrice$.mock.results[0].value;
                // Check if it is the right `Derivable`
                expect(googlPrice$.connected).toBe(true);

                // Then we set the price, as before
                googlPrice$.set(1079.11);

                /**
                 * **Your Turn**
                 * So the value was increased. What do you think happened now?
                 */
                expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
                expect(reactSpy).lastReturnedWith([__YOUR_TURN__]);

                /**
                 * So that worked, now let's try and add another company to the list
                 */
                companies$.swap(current => [...current, 'APPL']);

                expect(companies$.get()).toEqual(['GOOGL', 'APPL']);

                /**
                 * **Your Turn**
                 * With both 'GOOGL' and 'APPL' in the list, what do we expect as an output?
                 * We had a price for 'GOOGL', but not for 'APPL'...
                 */
                expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
                expect(reactSpy).lastReturnedWith([__YOUR_TURN__, __YOUR_TURN__]);
            });
        });
        /**
         * So we know a couple of problems that can arise, but how do we fix them.
         */
        describe('a solution', () => {
            /**
             * Let's try putting `stockPrice$` inside a `derivableCache`.
             * `derivableCache` requires a `derivableFactory`, this specifies the setup for a given key.
             * We know the key, and what to do with it, so let's try it!
             */
            const priceCache$ = derivableCache({
                derivableFactory: (company: Stocks) => stockPrice$(company),
            });
            /**
             * *Note that from this point forward we use `priceCache$` where we used to use `stockPrice$` directly*
             */

            it('should fix everything :-)', () => {
                // First setup an `Atom` with the company we are currently interested in
                const companies$ = atom<Stocks[]>(['GOOGL']);

                const html$ = companies$
                    .derive(companies =>
                        companies.map(company => `
                            <h1>Alphabet Price ($ ${priceCache$(company).value || 'unknown'})</h1>
                            <p>Some important text that uses the current price ($ ${priceCache$(company).value || 'unknown'}) as well</p>`
                        )
                    );

                html$.react(reactSpy);

                expect(html$.connected).toBe(true);
                expect(reactSpy).toBeCalledTimes(1);
                // Convenience function to return the first argument of the last call to the reactor
                function lastEmittedHTMLs() {
                    const nrCalls = reactSpy.mock.calls.length;
                    return reactSpy.mock.calls[nrCalls - 1][0];
                }
                // The last call, should have the array of HTML's as first argument
                expect(lastEmittedHTMLs()[0]).toContain('$ unknown');

                /**
                 * **Your Turn**
                 * The `Derivable` is connected and has emitted once.
                 * The price for the given company 'GOOGL' is displayed twice, just as in the first test.
                 *
                 * Has anything changed, by using the `derivableCache`?
                 */
                expect(stockPrice$).toBeCalledTimes(__YOUR_TURN__);

                // Now let's resolve the price for GOOGL
                const googlePrice$: DerivableAtom<number> = stockPrice$.mock.results[0].value;
                googlePrice$.set(1079.11);

                /**
                 * **Your Turn**
                 * Last time this caused the setup to run again, resolving to `unresolved` yet again.
                 * What happens this time? Has the setup run again?
                 */
                expect(stockPrice$).toBeCalledTimes(__YOUR_TURN__);
                // Ok, but did it update the HTML?
                expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
                expect(lastEmittedHTMLs()[0]).toContain(__YOUR_TURN__);

                // Last chance, what if we add a company
                companies$.swap(current => [...current, 'APPL']);

                /**
                 * **Your Turn**
                 * Now the `stockPrice$` function should have at least run again for 'APPL'.
                 * But did it calculate 'GOOGL' again too?
                 */
                expect(stockPrice$).toBeCalledTimes(__YOUR_TURN__);

                expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
                // The first should be 'GOOGL'
                expect(lastEmittedHTMLs()[0]).toContain(__YOUR_TURN__);
                // The second should be 'APPL'
                expect(lastEmittedHTMLs()[1]).toContain(__YOUR_TURN__);

                // Now let's resolve the price for APPL
                const ApplPrice$: DerivableAtom<number> = stockPrice$.mock.results[1].value;
                ApplPrice$.set(5.07);

                expect(reactSpy).toBeCalledTimes(__YOUR_TURN__);
                // The first should be 'GOOGL'
                expect(lastEmittedHTMLs()[0]).toContain(__YOUR_TURN__);
                // The second should be 'APPL'
                expect(lastEmittedHTMLs()[1]).toContain(__YOUR_TURN__);
            });
        });
    });
});
