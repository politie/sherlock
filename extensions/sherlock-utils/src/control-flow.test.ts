import { atom, Derivable, DerivableAtom, ErrorWrapper, State, transact, unresolved } from '@politie/sherlock';
import { controlFlow, ControlFlowOptions } from './control-flow';

describe('sherlock-utils/controlFlow', () => {
    let a$: DerivableAtom<string>;

    beforeEach(() => { a$ = atom.unresolved(); });

    describe('not connected get with', () => {
        describe('no options', () => {
            it('should always forward a get request when not connected', () => {
                jest.spyOn(a$, 'getState');
                const f$ = controlFlow(a$);
                expect(a$.getState).not.toHaveBeenCalled();
                expect(f$.resolved).toBe(false);
                expect(a$.getState).toHaveBeenCalledTimes(1);
                a$.set('boo');
                expect(f$.value).toBe('boo');
                expect(a$.getState).toHaveBeenCalledTimes(2);
            });

            it('should propagate errors', () => {
                const f$ = controlFlow(a$);
                a$.setError('my error');
                expect(f$.value).toBeUndefined();
                expect(f$.error).toBe('my error');
                a$.set('a');
                expect(f$.value).toBe('a');
                expect(f$.error).toBeUndefined();
            });
        });

        describe('from', () => {
            it('should be unresolved if `from` is false', () => {
                a$.set('value');
                const f$ = controlFlow(a$, { from: false });
                expect(f$.resolved).toBe(false);
            });

            it('should be unresolved while `from` is false', () => {
                a$.set('value');
                const from = atom(false);
                const f$ = controlFlow(a$, { from });
                expect(f$.resolved).toBe(false);
                from.set(true);
                expect(f$.value).toBe('value');
                from.unset();
                expect(f$.resolved).toBe(false);
                from.set(false);
                expect(f$.resolved).toBe(false);
            });

            it('should propagate errors iff `from` is true', () => {
                a$.setError('my error');
                const from = atom(false);
                const f$ = controlFlow(a$, { from });
                expect(f$.error).toBeUndefined();
                from.set(true);
                expect(f$.error).toBe('my error');
                from.unset();
                expect(f$.error).toBeUndefined();
                from.set(false);
                expect(f$.error).toBeUndefined();
            });
        });

        describe('until', () => {
            it('should be unresolved if `until` is true', () => {
                a$.set('value');
                const f$ = controlFlow(a$, { until: true });
                expect(f$.resolved).toBe(false);
            });

            it('should be unresolved while `until` is true', () => {
                a$.set('value');
                const until = atom(false);
                const f$ = controlFlow(a$, { until });
                expect(f$.value).toBe('value');
                until.set(true);
                expect(f$.resolved).toBe(false);
                until.unset();
                expect(f$.resolved).toBe(false);
                until.set(false);
                expect(f$.value).toBe('value');
            });

            it('should propagate errors iff `until` is false', () => {
                a$.setError('an error');
                const until = atom(false);
                const f$ = controlFlow(a$, { until });
                expect(f$.error).toBe('an error');
                until.set(true);
                expect(f$.error).toBeUndefined();
                until.unset();
                expect(f$.error).toBeUndefined();
                until.set(false);
                expect(f$.error).toBe('an error');
            });
        });

        describe('when', () => {
            it('should be unresolved if `when` is false', () => {
                a$.set('value');
                const f$ = controlFlow(a$, { when: false });
                expect(f$.resolved).toBe(false);
            });

            it('should be unresolved while `when` is false', () => {
                a$.set('value');
                const when = atom(false);
                const f$ = controlFlow(a$, { when });
                expect(f$.resolved).toBe(false);
                when.set(true);
                expect(f$.value).toBe('value');
                when.unset();
                expect(f$.resolved).toBe(false);
                when.set(false);
                expect(f$.resolved).toBe(false);
            });

            it('should propagate errors iff `when` is true', () => {
                a$.setError('foo');
                const when = atom(false);
                const f$ = controlFlow(a$, { when });
                expect(f$.error).toBeUndefined();
                when.set(true);
                expect(f$.error).toBe('foo');
                when.unset();
                expect(f$.error).toBeUndefined();
                when.set(false);
                expect(f$.error).toBeUndefined();
            });
        });

        describe('once', () => {
            it('should have no impact on the output', () => {
                a$.set('value');
                const f$ = controlFlow(a$, { once: true });
                expect(f$.value).toBe('value');
                expect(f$.value).toBe('value');

                a$.setError('bar');
                expect(f$.error).toBe('bar');
            });
        });

        describe('skipFirst', () => {
            it('should always be unresolved', () => {
                a$.set('value');
                const f$ = controlFlow(a$, { skipFirst: true });
                expect(f$.resolved).toBe(false);
                expect(f$.resolved).toBe(false);

                a$.setError('baz');
                expect(f$.resolved).toBe(false);
            });
        });
    });

    for (const includeUnresolved of [false, true]) {
        describe(`connected, with { includeUnresolved: ${includeUnresolved} }, using`, () => {

            describe('no options', () => {
                it(`should ${includeUnresolved ? '' : 'not '}return to unresolved while connected`, () => {
                    startTest();

                    shouldNotHaveReacted(unresolved);

                    a$.set('a');

                    shouldHaveReactedOnce('a');

                    a$.unset();

                    shouldNotHaveReacted(includeUnresolved ? unresolved : 'a');
                });

                it('should always return to unresolved when disconnected', () => {
                    startTest();
                    a$.set('a');
                    shouldHaveReactedOnce('a');
                    a$.unset();
                    shouldNotHaveReacted(includeUnresolved ? unresolved : 'a');
                    stopTest();
                    shouldNotHaveReacted(unresolved);
                });

                it('should disconnect when the reactor disconnects', () => {
                    startTest();
                    expect(a$.connected).toBe(true);
                    stopTest();
                    expect(a$.connected).toBe(false);
                });
            });

            describe('from', () => {
                let from: DerivableAtom<boolean>;
                beforeEach(() => { from = atom.unresolved<boolean>(); });

                it('should not start updating until `from` becomes true', () => {
                    startTest({ from });

                    shouldNotHaveReacted(unresolved);

                    a$.setError('error');
                    a$.set('a');
                    shouldNotHaveReacted(unresolved);

                    from.set(true);
                    shouldHaveReactedOnce('a');

                    // No impact anymore:
                    from.set(false);

                    a$.set('b');
                    shouldHaveReactedOnce('b');

                    a$.setError('error');
                    shouldHaveReactedOnce(new ErrorWrapper('error'));
                    shouldNotHaveReacted(new ErrorWrapper('error'));
                });

                it('should disconnect from the `from` derivable when it becomes true', () => {
                    from.set(false);
                    startTest({ from });

                    expect(a$.connected).toBe(false);
                    expect(from.connected).toBe(true);

                    from.set(true);

                    expect(a$.connected).toBe(true);
                    expect(from.connected).toBe(false);

                    stopTest();

                    expect(a$.connected).toBe(false);
                });

                describe('inside transactions', () => {
                    it('should be live', () => {
                        from.set(false);
                        a$.set('a');
                        const f$ = startTest({ from });

                        transact(() => {
                            expect(f$.resolved).toBe(false);

                            // Works as expected:
                            from.set(true);
                            expect(f$.value).toBe('a');

                            // But we can undo our work because we are inside a transaction.
                            from.set(false);
                            expect(f$.resolved).toBe(false);
                        });

                        expect(f$.resolved).toBe(false);
                    });

                    it('should be consistent', () => {
                        from.set(false);
                        a$.set('a');
                        startTest({ from });

                        shouldNotHaveReacted(unresolved);

                        transact(() => {
                            from.set(true);
                            a$.set('b');
                            a$.set('c');
                            from.set(false);
                        });

                        shouldNotHaveReacted(unresolved);
                    });
                });
            });

            describe('until', () => {
                let until: DerivableAtom<boolean>;
                beforeEach(() => { until = atom.unresolved<boolean>(); });

                it('should update until the `until` derivable becomes true', () => {
                    startTest({ until });

                    shouldNotHaveReacted(unresolved);

                    a$.set('a');
                    shouldNotHaveReacted(unresolved);

                    until.set(false);
                    shouldHaveReactedOnce('a');

                    a$.setError('my error');
                    shouldHaveReactedOnce(new ErrorWrapper('my error'));

                    a$.set('b');
                    shouldHaveReactedOnce('b');

                    until.set(true);
                    shouldNotHaveReacted('b');

                    // No impact
                    a$.set('c');
                    shouldNotHaveReacted('b');
                });

                it('should disconnect from the base when `until` becomes true', () => {
                    until.set(false);
                    startTest({ until });

                    expect(a$.connected).toBe(true);
                    expect(until.connected).toBe(true);

                    until.set(true);

                    expect(a$.connected).toBe(false);
                    expect(until.connected).toBe(false);
                });

                it('should support derived `until` option', () => {
                    startTest({ until: d => d.is('stop now') });

                    shouldNotHaveReacted(unresolved);

                    a$.set('abc');
                    shouldHaveReactedOnce('abc');

                    a$.set('def');
                    shouldHaveReactedOnce('def');

                    a$.set('stop now');
                    shouldNotHaveReacted('def');
                });

                describe('inside transactions', () => {
                    it('should be live', () => {
                        until.set(false);
                        a$.set('a');
                        const f$ = startTest({ until });

                        transact(() => {
                            expect(f$.value).toBe('a');

                            a$.set('b');
                            expect(f$.value).toBe('b');

                            // Always represents state that should be visible after the transaction:
                            until.set(true);
                            a$.set('c');
                            expect(f$.value).toBe('a');

                            // But we can undo everything because we are inside a transaction.
                            until.set(false);
                            expect(f$.value).toBe('c');

                            until.set(true);
                        });

                        expect(f$.value).toBe('a');
                    });

                    it('should be consistent', () => {
                        until.set(false);
                        a$.set('a');
                        startTest({ until });

                        shouldHaveReactedOnce('a');

                        transact(() => {
                            a$.set('b');
                            a$.set('c');
                            until.set(true);
                        });

                        shouldNotHaveReacted('a');
                    });
                });
            });

            describe('when', () => {
                let when: DerivableAtom<boolean>;
                beforeEach(() => { when = atom.unresolved<boolean>(); });

                it('should only update when `when` is true', () => {
                    startTest({ when });

                    shouldNotHaveReacted(unresolved);

                    a$.set('a');
                    shouldNotHaveReacted(unresolved);

                    when.set(false);
                    shouldNotHaveReacted(unresolved);

                    when.set(true);
                    shouldHaveReactedOnce('a');

                    a$.setError('my error');
                    shouldHaveReactedOnce(new ErrorWrapper('my error'));

                    a$.set('b');
                    shouldHaveReactedOnce('b');

                    when.set(false);
                    shouldNotHaveReacted('b');

                    a$.set('c');
                    shouldNotHaveReacted('b');

                    when.set(true);
                    shouldHaveReactedOnce('c');
                });

                it('should disconnect from the base when `when` is false', () => {
                    when.set(true);
                    startTest({ when });

                    expect(a$.connected).toBe(true);
                    expect(when.connected).toBe(true);

                    when.set(false);

                    expect(a$.connected).toBe(false);
                    expect(when.connected).toBe(true);

                    stopTest();

                    expect(when.connected).toBe(false);
                });

                describe('inside transactions', () => {
                    it('should be live', () => {
                        a$.set('a');
                        const f$ = startTest({ when });

                        when.set(true);
                        expect(f$.value).toBe('a');

                        transact(() => {
                            a$.set('b');
                            expect(f$.value).toBe('b');

                            // Always represents state that should be visible after the transaction:
                            when.set(false);
                            expect(f$.value).toBe('a');

                            when.set(true);
                            expect(f$.value).toBe('b');

                            when.set(false);
                        });

                        expect(f$.value).toBe('a');
                    });

                    it('should be consistent', () => {
                        when.set(true);
                        a$.set('a');
                        startTest({ when });

                        shouldHaveReactedOnce('a');

                        when.set(false);

                        transact(() => {
                            when.set(true);
                            a$.set('b');
                            a$.set('c');
                            when.set(false);
                        });

                        shouldNotHaveReacted('a');
                    });

                    it('should also work with derived `when` option', () => {
                        const f$ = startTest({ when: d => d.getOr('').length > 3 });

                        shouldNotHaveReacted(unresolved);

                        a$.set('abc');
                        expect(f$.value).toBeUndefined();
                        a$.set('abcd');
                        expect(f$.value).toBe('abcd');

                        transact(() => {
                            a$.set('abcde');
                            expect(f$.value).toBe('abcde');
                            a$.set('ab');
                            expect(f$.value).toBe('abcd');
                            a$.unset();
                            expect(f$.value).toBe('abcd');
                        });

                        expect(f$.value).toBe('abcd');
                    });
                });
            });

            describe('once', () => {
                it('should update only once and keep the value after that', () => {
                    startTest({ once: true });
                    shouldNotHaveReacted(unresolved);
                    a$.set('a');

                    // `includeUnresolved` is awkward in combination with `once`.
                    if (includeUnresolved) {
                        shouldNotHaveReacted(unresolved);
                        a$.set('b');
                        shouldNotHaveReacted(unresolved);
                    } else {
                        shouldHaveReactedOnce('a');
                        a$.set('b');
                        shouldNotHaveReacted('a');
                    }
                });

                it('should count an error as an update and thus stop after the first', () => {
                    startTest({ once: true });
                    shouldNotHaveReacted(unresolved);

                    a$.setError('my error');
                    includeUnresolved
                        ? shouldNotHaveReacted(unresolved)
                        : shouldHaveReactedOnce(new ErrorWrapper('my error'));

                    a$.setError('another error');
                    shouldNotHaveReacted(includeUnresolved ? unresolved : new ErrorWrapper('my error'));

                    a$.set('a');
                    shouldNotHaveReacted(includeUnresolved ? unresolved : new ErrorWrapper('my error'));
                    a$.set('b');
                    shouldNotHaveReacted(includeUnresolved ? unresolved : new ErrorWrapper('my error'));
                });

                it('should support a synchronous `once` without maintaining garbage', () => {
                    a$.set('synchronous value');
                    let connectionChanges = 0;
                    a$.connected$.react(() => connectionChanges++, { skipFirst: true });

                    const f$ = startTest({ once: true });

                    expect((f$ as any)._baseConnectionStopper).toBeUndefined();

                    expect(connectionChanges).toBe(2);
                    expect(f$.get()).toBe('synchronous value');
                    expect(connectionChanges).toBe(2);
                });

                it('should disconnect after the first value', () => {
                    let connectionChanges = 0;
                    a$.connected$.react(() => connectionChanges++, { skipFirst: true });

                    const f$ = startTest({ once: true });

                    expect(f$.resolved).toBe(false);

                    if (includeUnresolved) {

                        expect(connectionChanges).toBe(2);
                        expect((f$ as any)._baseConnectionStopper).toBeUndefined();

                        a$.set('asynchronous value');

                        expect(f$.resolved).toBe(false);
                        expect(connectionChanges).toBe(2);

                    } else {

                        expect(connectionChanges).toBe(1);
                        expect((f$ as any)._baseConnectionStopper).toBeFunction();

                        a$.set('asynchronous value');

                        expect(connectionChanges).toBe(2);
                        expect((f$ as any)._baseConnectionStopper).toBeUndefined();

                        expect(f$.get()).toBe('asynchronous value');
                        expect(connectionChanges).toBe(2);
                    }
                });

                it('should consider a transaction as one big update', () => {
                    const f$ = startTest({ once: true });

                    transact(() => {
                        a$.set('a');
                        expect(f$.value).toBe('a');
                        a$.set('b');
                        expect(f$.value).toBe('b');
                        a$.set('c');
                        expect(f$.value).toBe('c');
                    });

                    includeUnresolved
                        ? shouldNotHaveReacted(unresolved)
                        : shouldHaveReactedOnce('c');
                });
            });

            describe('skipFirst', () => {
                it('should never present the first state from the returned derivable (synchronous start)', () => {
                    a$.set('first value');
                    startTest({ skipFirst: true });
                    shouldNotHaveReacted(unresolved);

                    a$.set('second value');
                    shouldHaveReactedOnce('second value');

                    a$.set('third value');
                    shouldHaveReactedOnce('third value');

                    a$.unset();
                    shouldNotHaveReacted(includeUnresolved ? unresolved : 'third value');
                });

                it('should never present the first state from the returned derivable (asynchronous start)', () => {
                    startTest({ skipFirst: true });
                    shouldNotHaveReacted(unresolved);

                    a$.set('first value');
                    includeUnresolved
                        ? shouldHaveReactedOnce('first value')
                        : shouldNotHaveReacted(unresolved);

                    a$.set('second value');
                    shouldHaveReactedOnce('second value');

                    a$.set('third value');
                    shouldHaveReactedOnce('third value');

                    a$.unset();
                    shouldNotHaveReacted(includeUnresolved ? unresolved : 'third value');
                });

                it('should consider a transaction as one big update', () => {
                    const f$ = startTest({ skipFirst: true });

                    shouldNotHaveReacted(unresolved);

                    transact(() => {
                        a$.set('a');
                        expect(f$.value).toBeUndefined();
                        a$.set('b');
                        expect(f$.value).toBeUndefined();
                        a$.set('c');
                        expect(f$.value).toBeUndefined();
                    });

                    includeUnresolved
                        ? shouldHaveReactedOnce('c')
                        : shouldNotHaveReacted(unresolved);

                    a$.set('d');

                    shouldHaveReactedOnce('d');
                });
            });

            let currentTest: { reactions: number, value: any, f$: Derivable<any> } | undefined;
            let currentStopper: (() => void) | undefined;
            function startTest(opts?: ControlFlowOptions<string>) {
                const f$ = controlFlow(a$, { ...opts, includeUnresolved });
                currentTest = { reactions: 0, value: undefined, f$ };
                const reaction = (v: any) => {
                    currentTest!.reactions++;
                    currentTest!.value = v;
                };
                currentStopper = f$.react(reaction, { onError: err => reaction(new ErrorWrapper(err)) });
                return f$;
            }

            function stopTest() {
                currentStopper!();
                currentStopper = undefined;
            }

            afterEach(() => {
                currentTest = undefined;
                currentStopper && currentStopper();
                currentStopper = undefined;
            });

            function shouldNotHaveReacted(currentValue: State<any>) {
                expect(currentTest!.reactions).toBe(0);
                expect(currentTest!.f$.getState()).toEqual(currentValue);
                currentTest!.reactions = 0;
            }

            function shouldHaveReactedOnce(value: any) {
                expect(currentTest!.reactions).toBe(1);
                expect(currentTest!.value).toEqual(value);
                expect(currentTest!.f$.getState()).toEqual(value);
                currentTest!.reactions = 0;
            }
        });
    }
});
