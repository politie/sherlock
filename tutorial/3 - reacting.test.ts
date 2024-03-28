import { atom } from '../src';

/**
 * **Your Turn**
 * If you see this variable, you should do something about it. :-)
 */
export const __YOUR_TURN__ = {} as any;

/**
 * In the intro we have seen a basic usage of the `.react()` method.
 * Let's dive a bit deeper into the details of this method.
 */
describe('reacting', () => {
    // For easy testing we can count the number of times a reactor was called,
    let wasCalledTimes: number;
    // and record the last value it reacted to.
    let lastValue: any;
    beforeEach(() => {
        wasCalledTimes = 0;
        lastValue = undefined;
    });
    // The reactor to be given to the `.react()` method.
    function reactor(val: any) {
        wasCalledTimes++;
        lastValue = val;
    }
    // Of course we are lazy and don't want to type these assertions over and over. :-)
    function expectReact(reactions: number, value?: any) {
        expect(wasCalledTimes).toBe(reactions);
        expect(lastValue).toBe(value);
    }

    /**
     * Every `Derivable` always has a current state. So the `.react()` method does not need to wait for a value, there already is one.
     * This means that `.react()` will fire directly when called.
     * When the `Derivable` has a new state, this will also fire `.react()` synchronously.
     * So the very next line after `.set()` is called, the `.react()` has already fired!
     *
     * (Except when the `Derivable` is `unresolved`, but more on that later.)
     */
    it('reacting synchronously', () => {
        const myAtom$ = atom('initial value');
        // A trivial `expect` to silence TypeScript's noUnusedLocals.
        expect(myAtom$.get()).toBe('initial value');

        // There should not have been a reaction yet
        expectReact(0);

        /**
         * **Your Turn**
         * Time to react to `myAtom$` with the `reactor()` function defined above.
         */
        myAtom$.react(reactor)
        expectReact(1, 'initial value');

        // Now set a 'new value' to `myAtom$`.
        myAtom$.set('new value')
        expectReact(2, 'new value');
    });

    /**
     * A reactor will go on forever. This is often not what you want, and almost always a memory leak.
     * So it is important to stop a reactor at some point. The `.react()` method has different ways of dealing with this.
     */
    describe('stopping a reaction', () => {
        /**
         * The easiest is the 'stopper' function, every `.react()` call will return a `function` that will stop the reaction.
         */
        it('with the stopper function', () => {
            const myAtom$ = atom('initial value');
            // A trivial `expect` to silence TypeScript's noUnusedLocals
            expect(myAtom$.get()).toBe('initial value');

            /**
             * **Your Turn**
             * catch the returned `stopper` in a variable
             */
            const stopper = myAtom$.react(reactor);

            expectReact(1, 'initial value');

            /**
             * **Your Turn**
             * Call the `stopper`.
             */
            stopper();
            myAtom$.set('new value');

            // And the reaction stopped.
            expectReact(1, 'initial value');
        });

        /**
         * Everytime the reaction is called, it also gets the stopper `function` as a second parameter.
         */
        it('with the stopper callback', () => {
            const myAtom$ = atom('initial value');
            // A trivial `expect` to silence TypeScript's noUnusedLocals
            expect(myAtom$.get()).toBe('initial value');

            /**
             * **Your Turn**
             * In the reaction below, use the stopper callback to stop the reaction
             */
            myAtom$.react((val, stopper) => {
                reactor(val);
                stopper();
            });

            expectReact(1, 'initial value');

            myAtom$.set('new value');

            // And the reaction stopped.
            expectReact(1, 'initial value');
        });

    });

    /**
     * The reactor `options` are a way to modify when and how the reactor will react to changes in the `Derivable`.
     */
    describe('reactor options', () => {
        /**
         * Another way to make a reactor stop at a certain point, is by specifying an `until` in the `options`.
         * `until` can be given either a `Derivable` or a `function`.
         * If a `function` is given, this `function` will be given the `Derivable` that is the source of the reaction as a parameter.
         * This `function` will track all `.get()`s, so can use any `Derivable`. It can return a `boolean` or a `Derivable<boolean>`.
         * *Note: the reactor options `when` and `from` can also be set to a `Derivable`/`function` as described here.*
         *
         * The reactor will stop directly when `until` becomes true.
         * If that happens at exactly the same time as the `Derivable` getting a new value, it will not react again.
         */
        describe('reacting `until`', () => {
            const boolean$ = atom(false);
            const string$ = atom('Value');
            beforeEach(() => {
                boolean$.set(false);
                string$.set('Value');
            });

            /**
             * If a `Derivable` is given, the reaction will stop once that `Derivable` becomes `true`/truthy.
             */
            it('an external `Derivable`', () => {
                /**
                 * **Your Turn**
                 * Try giving `boolean$` as `until` option.
                 */
                string$.react(reactor, {until: boolean$});
                expectReact(1, 'Value');     // It should react directly as usual.

                string$.set('New value');
                expectReact(2, 'New value'); // It should keep reacting as usual.

                boolean$.set(true);          // We set `boolean$` to true, to stop the reaction
                expectReact(2, 'New value'); // The reactor has immediately stopped, so it still reacted only twice.

                boolean$.set(false);            // Even when `boolean$` is set to `false` again
                string$.set('Another value');   // And a new value is introduced
                expectReact(2, 'New value');    // The reactor won't start up again, so it still reacted only twice.
            });

            /**
             * A function can also be given as `until` this function will be executed in a derivation.
             * This way any `Derivable` can be used in the calculation.
             */
            it('a function', () => {
                /**
                 * **Your Turn**
                 * Since the reactor options expect a boolean, you will sometimes need to calculate the option.
                 * Try giving a `function` as `until` option, use `!string$.get()` to return `true` when the `string` is empty.
                 */
                string$.react(reactor, { until: () => !string$.get() });
                string$.set('New value');
                string$.set('Newer Value');
                expectReact(3, 'Newer Value'); // It should react as usual.

                string$.set('');               // We set `string$` to an empty string, to stop the reaction
                expectReact(3, 'Newer Value'); // The reactor was immediately stopped, so even the empty string was never given to the reactor
            });

            /**
             * Since the example above, where the `until` is based on the parent `Derivable` occurs very frequently.
             * This `Derivable` is given as a parameter to the `until` function.
             */
            it('the parent `Derivable`', () => {
                /**
                 * **Your Turn**
                 * Try using the first parameter of the `until` function to do the same as above.
                 */
                string$.react(reactor, { until: (stringVal) => !stringVal.get() });
                string$.set('New value');
                string$.set('Newer Value');
                expectReact(3, 'Newer Value'); // It should react as usual.

                string$.set('');               // We set `string$` to an empty string, to stop the reaction
                expectReact(3, 'Newer Value'); // The reactor was immediately stopped, so even the empty string was never given to the reactor
            });
        });

        /**
         * Sometimes you may not need to react to the first couple of values of the `Derivable`.
         * This can be because of the value of the `Derivable` or due to external conditions.
         * The `from` option is meant to help with this. The reactor will only start after it becomes true.
         * Once it has become true, the reactor will not listen to this option any more and react as usual.
         *
         * *Note: when using `from`, `.react()` will (most often) not react synchronously any more. As that is the function of this option.*
         */
        it('reacting `from`', () => {
            const sherlock$ = atom('');

            /**
             * **Your Turn**
             * We can react here, but restrict the reactions to start when the keyword 'dear' is set.
             * This will skip the first three reactions, but react as usual after that.
             *
             * *Hint: remember the `.is()` method?*
             */
            sherlock$.react(reactor, { from: () => sherlock$.is('dear')});

            expectReact(0);
            ['Elementary,', 'my', 'dear', 'Watson'].forEach(txt => sherlock$.set(txt));

            expectReact(2, 'Watson');
        });

        /**
         * Sometimes you may want to react only on certain values or when certain conditions are met.
         * It works exactly as `from`
         *
         * *Note: as with `from` this can prevent `.react()` from reacting synchronously.*
         */
        it('reacting `when`', () => {
            const count$ = atom(0);

            /**
             * Now, let's react to all even numbers.
             * Except 4, we don't want to make it too easy now.
             */
            count$.react(reactor, { when: () => {
                const value = count$.get();
                return value % 2 === 0 && value !== 4 ? true : false
            }});

            expectReact(1, 0);

            for (let i = 0; i <= 4; i++) {
                count$.set(i);
            }
            expectReact(2, 2);
            for (let i = 4; i <= 10; i++) {
                count$.set(i);
            }
            expectReact(5, 10);
        });

        /**
         * Normally the reactor will immediately fire with the current value.
         * If you want the reactor to fire normally, just not the first time, there is also a `boolean` option: `skipFirst`.
         */
        it('reacting with `skipFirst`', () => {
            const done$ = atom(false);

            /**
             * **Your Turn**
             * Say you want to react when `done$` is true. But not right away..
             */
            done$.react(reactor, { skipFirst: true});
            expectReact(0);

            done$.set(true);
            expectReact(1, true);
        });

        /**
         * With `once` you can stop the reactor after it has emitted exactly one value. This is a `boolean` option.
         *
         * Without any other `options`, this is just a strange way of typing `.get()`.
         * But when combined with `when`, `from` or `skipFirst`, it can be very useful.
         */
        it('reacting `once`', () => {
            const finished$ = atom(false);

            /**
             * **Your Turn**
             * Say you want to react when `finished$` is true. It can not finish twice.
             *
             * *Hint: you will need to combine `once` with another option*
             */
            finished$.react(reactor, { once: true, when: finished$});
            expectReact(0);

            // When finished it should react once.
            finished$.set(true);
            expectReact(1, true);

            // After that it should really be finished. :-)
            finished$.set(false);
            finished$.set(true);
            expectReact(1, true);
        });

    });

    describe('challenge', () => {
        it('onDisconnect', () => {
            const connected$ = atom(false);

            /**
             * **Your Turn**
             * We want our reactor to trigger once, when the user disconnects (eg for cleanup).
             * `connected$` indicates the current connection status.
             * This should be possible with three simple ReactorOptions
             */
            connected$.react(reactor, { from: connected$ , when: () => connected$.is(false), once: true});

            // It starts as 'not connected'
            expectReact(0);

            // At this point, the user connects, no reaction should occur yet.
            connected$.set(true);
            expectReact(0);

            // When the user disconnects, the reaction should fire once
            connected$.set(false);
            expectReact(1, false);

            // It should not react again after this
            expect(connected$.connected).toBe(false);
        });

    });
});
