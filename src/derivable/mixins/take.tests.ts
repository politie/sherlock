import { Derivable, DerivableAtom, SettableDerivable, State, TakeOptions } from '../../interfaces';
import { unresolved } from '../../symbols';
import { txn } from '../../transaction/transaction.tests';
import { ErrorWrapper } from '../../utils';
import { assertDerivableAtom, assertSettable, Factory } from '../base-derivable.tests';
import { atom } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

export function testTake(factory: Factory, isSettable: boolean, noRollbackSupport: boolean) {

    describe('#take', () => {
        describe('with no options', () => {
            it('should return the same derivable', () => {
                const a$ = factory('value');
                expect(a$.take({})).toBe(a$);
            });
        });

        describe('not connected get with', () => {
            describe('from', () => {
                it('should be unresolved if `from` is false', () => {
                    const a$ = factory('value');
                    const f$ = a$.take({ from: false });
                    expect(f$.resolved).toBe(false);
                });

                it('should be unresolved while `from` is false', () => {
                    const a$ = factory('value');
                    const from = atom(false);
                    const f$ = a$.take({ from });
                    expect(f$.resolved).toBe(false);
                    from.set(true);
                    expect(f$.value).toBe('value');
                    from.unset();
                    expect(f$.value).toBe('value');
                    from.set(false);
                    expect(f$.value).toBe('value');
                });

                it('should propagate errors once `from` becomes true (once)', () => {
                    const a$ = factory(new ErrorWrapper('my error'));
                    const from = atom(false);
                    const f$ = a$.take({ from });
                    expect(f$.error).toBeUndefined();
                    from.set(true);
                    expect(f$.error).toBe('my error');
                    from.unset();
                    expect(f$.error).toBe('my error');
                    from.set(false);
                    expect(f$.error).toBe('my error');
                });
            });

            describe('until', () => {
                it('should be unresolved if `until` is true', () => {
                    const a$ = factory('value');
                    const f$ = a$.take({ until: true });
                    expect(f$.resolved).toBe(false);
                });

                it('should not update anymore once `until` becomes true (once)', () => {
                    const a$ = factory('value');
                    const until = atom(false);
                    const f$ = a$.take({ until });
                    expect(f$.value).toBe('value');
                    if (isSettableDerivable(a$)) {
                        a$.set('other value');
                        expect(f$.value).toBe('other value');
                        a$.set('value');
                        expect(f$.value).toBe('value');
                    }
                    until.set(true);
                    expect(f$.value).toBe('value');
                    if (isSettableDerivable(a$)) {
                        a$.set('other value');
                        expect(f$.value).toBe('value');
                    }
                    until.unset();
                    expect(f$.value).toBe('value');
                    until.set(false);
                    expect(f$.value).toBe('value');
                });

                isSettable && it('should become final after the first observation after `until` becomes true (once)', () => {
                    const a$ = factory('a');
                    if (!isSettableDerivable(a$)) { throw 0; }
                    const until = atom(false);
                    const f$ = a$.take({ until });
                    expect(f$.value).toBe('a');
                    a$.set('b');
                    expect(f$.value).toBe('b');
                    // The following updates are never observed, they will not be represented by f$. This is due to optimizations in Sherlock.
                    // Most operators are optimized to work best in connected mode.
                    a$.set('c');
                    until.set(true);
                    a$.set('d');
                    expect(f$.value).toBe('b');
                    a$.set('e');
                    expect(f$.value).toBe('b');
                });

                it('should propagate errors until `until` becomes true', () => {
                    const a$ = factory(new ErrorWrapper('an error'));
                    const until = atom(false);
                    const f$ = a$.take({ until });
                    expect(f$.error).toBe('an error');
                    until.set(true);
                    expect(f$.error).toBe('an error');
                    until.unset();
                    expect(f$.error).toBe('an error');
                });

                it('should flag the final value as final', () => {
                    const a$ = factory('value');
                    const until = atom(false);
                    const fn = jest.fn(v => v);
                    const d$ = a$.take({ until }).map(fn);
                    expect(d$.value).toBe('value');
                    expect(fn).toHaveBeenCalledTimes(1);
                    expect(d$.value).toBe('value');
                    expect(fn).toHaveBeenCalledTimes(a$.final ? 1 : 2);
                    until.set(true);
                    expect(d$.value).toBe('value');
                    expect(d$.value).toBe('value');
                    expect(d$.value).toBe('value');
                    expect(fn).toHaveBeenCalledTimes(a$.final ? 1 : 3);
                });
            });

            describe('when', () => {
                it('should be unresolved if `when` is false', () => {
                    const a$ = factory('value');
                    const f$ = a$.take({ when: false });
                    expect(f$.resolved).toBe(false);
                });

                it('should not update while `when` is false', () => {
                    const a$ = factory('value');
                    const when = atom(false);
                    const f$ = a$.take({ when });
                    expect(f$.resolved).toBe(false);
                    when.set(true);
                    expect(f$.value).toBe('value');
                    if (isSettableDerivable(a$)) {
                        a$.set('other value');
                        expect(f$.value).toBe('other value');
                        a$.set('value');
                        expect(f$.value).toBe('value');
                        a$.set('other value');
                        // This last update is never observed, so it will not be visible when `when` becomes false again.
                    }
                    when.set(false);
                    expect(f$.value).toBe('value');
                    when.unset();
                    expect(f$.value).toBe('value');
                    when.set(true);
                    expect(f$.value).toBe(isSettableDerivable(a$) ? 'other value' : 'value');
                });

                it('should propagate errors while `when` is true', () => {
                    const a$ = factory<string>(new ErrorWrapper('foo'));
                    const when = atom(false);
                    const f$ = a$.take({ when });
                    expect(f$.error).toBeUndefined();
                    when.set(true);
                    expect(f$.error).toBe('foo');
                    when.unset();
                    if (isSettableDerivable(a$)) {
                        a$.set('a value');
                    }
                    expect(f$.error).toBe('foo');
                    when.set(false);
                    expect(f$.error).toBe('foo');
                    when.set(true);
                    if (isSettableDerivable(a$)) {
                        expect(f$.value).toBe('a value');
                    } else {
                        expect(f$.error).toBe('foo');
                    }
                });
            });

            describe('once', () => {
                it('should remember the first ever observed value', () => {
                    const a$ = factory('value');
                    const f$ = a$.take({ once: true });
                    expect(f$.value).toBe('value');
                    if (isDerivableAtom(a$)) {
                        a$.set('bar');
                    }
                    expect(f$.value).toBe('value');
                    if (isDerivableAtom(a$)) {
                        a$.setError('baz');
                    }
                    expect(f$.value).toBe('value');

                    const b$ = factory('value');
                    if (isSettableDerivable(b$)) {
                        const g$ = b$.take({ once: true });
                        b$.set('other value');
                        b$.set('observed value');
                        expect(g$.value).toBe('observed value');
                        b$.set('not observed value');
                        expect(g$.value).toBe('observed value');
                    }
                });

                it('should flag the value as final', () => {
                    const a$ = factory<string>(unresolved);
                    const fn = jest.fn(v => v);
                    const d$ = a$.take({ once: true }).map(fn);
                    expect(d$.value).toBeUndefined();
                    expect(fn).not.toHaveBeenCalled();
                    if (isSettableDerivable(a$)) {
                        a$.set('a value');
                        expect(d$.value).toBe('a value');
                        expect(d$.value).toBe('a value');
                        expect(fn).toHaveBeenCalledTimes(1);
                        a$.set('another value');
                        expect(d$.value).toBe('a value');
                        expect(d$.value).toBe('a value');
                        expect(fn).toHaveBeenCalledTimes(1);
                    }
                });
            });

            describe('skipFirst', () => {
                it('should skip the first observed value', () => {
                    const a$ = factory('value');
                    const f$ = a$.take({ skipFirst: true });

                    // first observation...
                    expect(f$.resolved).toBe(false);
                    expect(f$.value).toBeUndefined();

                    if (isSettableDerivable(a$)) {
                        a$.set('another value');
                        a$.set('value');
                        // still the same as the first observation, no update yet
                        expect(f$.value).toBeUndefined();
                        a$.set('yet another value');
                        expect(f$.value).toBe('yet another value');
                    }
                });

                it('should not count errors or unresolved as an encountered value', () => {
                    const a$ = factory<string>(unresolved);
                    const f$ = a$.take({ skipFirst: true });
                    expect(f$.value).toBeUndefined();
                    if (isDerivableAtom(a$)) {
                        a$.setError('my error');
                        expect(f$.value).toBeUndefined();
                        a$.unset();
                        expect(f$.value).toBeUndefined();
                        a$.setError('my error');
                        expect(f$.value).toBeUndefined();
                    }
                    if (isSettableDerivable(a$)) {
                        a$.set('first unobserved value');
                        a$.set('first observed value');
                        expect(f$.value).toBeUndefined();
                        a$.set('second observed value');
                        expect(f$.value).toBe('second observed value');
                    }
                });
            });
        });

        isSettable && describe(`connected, using`, () => {
            let a$: SettableDerivable<string>;

            beforeEach(() => a$ = assertSettable(factory<string>(unresolved)));

            describe('from', () => {
                let from: DerivableAtom<boolean>;
                beforeEach(() => { from = atom.unresolved<boolean>(); });

                it('should not start updating until `from` becomes true', () => {
                    startTest({ from });

                    shouldNotHaveReacted(unresolved);

                    isDerivableAtom(a$) && a$.setError('error');
                    a$.set('a');
                    shouldNotHaveReacted(unresolved);

                    from.set(true);
                    shouldHaveReactedOnce('a');

                    // No impact anymore:
                    from.set(false);

                    a$.set('b');
                    shouldHaveReactedOnce('b');

                    if (!isDerivableAtom(a$)) { return; }

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

                        txn(abort => {
                            expect(f$.resolved).toBe(false);

                            // Works as expected:
                            from.set(true);
                            expect(f$.value).toBe('a');

                            // Inside transactions the same rules apply as outside transactions.
                            from.set(false);
                            expect(f$.value).toBe('a');
                            abort();
                        });

                        // But an aborted transaction reverts everything.
                        expect(f$.resolved).toBe(false);
                    });

                    it('should be consistent', () => {
                        from.set(false);
                        a$.set('a');
                        startTest({ from });

                        shouldNotHaveReacted(unresolved);

                        txn(() => {
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

                    if (isDerivableAtom(a$)) {
                        a$.setError('my error');
                        shouldHaveReactedOnce(new ErrorWrapper('my error'));
                    }

                    a$.set('b');
                    shouldHaveReactedOnce('b');

                    until.set(true);
                    shouldNotHaveReacted('b');

                    // No impact
                    a$.set('c');
                    shouldNotHaveReacted('b');

                    if (isDerivableAtom(a$)) {
                        a$.setError('my error');
                        shouldNotHaveReacted('b');
                    }
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

                        txn(() => {
                            expect(f$.value).toBe('a');

                            a$.set('b');
                            expect(f$.value).toBe('b');

                            // Inside transactions the same rules apply as outside transactions. So once until has been true, it will stop the updates to f$.
                            until.set(true);
                            a$.set('c');
                            expect(f$.value).toBe('b');

                            until.set(false);
                            expect(f$.value).toBe('b');
                        });

                        expect(until.value).toBe(false);
                        expect(f$.value).toBe('b');
                    });

                    it('should be rolled back when the transaction rolls back', () => {
                        until.set(false);
                        a$.set('a');
                        const f$ = startTest({ until });

                        txn(abort => {
                            expect(f$.value).toBe('a');

                            a$.set('b');
                            expect(f$.value).toBe('b');

                            // Inside transactions the same rules apply as outside transactions. So once until has been true, it will stop the updates to f$.
                            until.set(true);
                            a$.set('c');
                            expect(f$.value).toBe('b');

                            // But we can undo everything because we can abort the transaction
                            abort();
                        });

                        expect(f$.value).toBe(noRollbackSupport ? 'c' : 'a');
                        expect(until.value).toBe(false);
                        a$.set('b');
                        expect(f$.value).toBe('b');
                    });

                    it('should be consistent', () => {
                        until.set(false);
                        a$.set('a');
                        startTest({ until });

                        shouldHaveReactedOnce('a');

                        txn(() => {
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

                    if (isDerivableAtom(a$)) {
                        a$.setError('my error');
                        shouldHaveReactedOnce(new ErrorWrapper('my error'));
                    }

                    a$.set('b');
                    shouldHaveReactedOnce('b');

                    when.set(false);
                    shouldNotHaveReacted('b');

                    if (isDerivableAtom(a$)) {
                        a$.setError('my error');
                        shouldNotHaveReacted('b');
                    }

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

                        txn(() => {
                            a$.set('b');
                            expect(f$.value).toBe('b');

                            when.set(false);
                            expect(f$.value).toBe('b');

                            when.set(true);
                            expect(f$.value).toBe('b');

                            when.set(false);
                        });

                        expect(f$.value).toBe('b');
                    });

                    it('should be consistent', () => {
                        when.set(true);
                        a$.set('a');
                        startTest({ when });

                        shouldHaveReactedOnce('a');

                        when.set(false);

                        txn(() => {
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

                        txn(() => {
                            a$.set('abcde');
                            expect(f$.value).toBe('abcde');
                            if (isDerivableAtom(a$)) {
                                a$.unset();
                                expect(f$.value).toBe('abcde');
                            }
                            a$.set('ab');
                            expect(f$.value).toBe('abcde');
                        });

                        expect(f$.value).toBe('abcde');
                    });

                    it('should be rolled back when the transaction aborts', () => {
                        when.set(true);
                        a$.set('a');
                        const f$ = startTest({ when });

                        shouldHaveReactedOnce('a');

                        when.set(false);

                        txn(abort => {
                            when.set(true);
                            a$.set('b');
                            a$.set('c');
                            expect(f$.value).toBe('c');
                            abort();
                        });

                        shouldNotHaveReacted('a');

                    });
                });
            });

            describe('once', () => {
                it('should update only once and keep the value after that', () => {
                    startTest({ once: true });
                    shouldNotHaveReacted(unresolved);
                    a$.set('a');

                    shouldHaveReactedOnce('a');
                    a$.set('b');
                    shouldNotHaveReacted('a');
                });

                it('should not count an error as an update and still stop after the first real value', () => {
                    startTest({ once: true });
                    shouldNotHaveReacted(unresolved);

                    if (isDerivableAtom(a$)) {
                        a$.setError('my error');
                        shouldHaveReactedOnce(new ErrorWrapper('my error'));

                        a$.setError('another error');
                        shouldHaveReactedOnce(new ErrorWrapper('another error'));
                    }

                    a$.set('a');
                    shouldHaveReactedOnce('a');
                    a$.set('b');
                    shouldNotHaveReacted('a');

                    if (isDerivableAtom(a$)) {
                        a$.setError('an error again');
                        shouldNotHaveReacted('a');
                    }
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

                    expect(connectionChanges).toBe(1);
                    expect((f$ as any)._deriver).toBeFunction();

                    a$.set('asynchronous value');

                    expect(connectionChanges).toBe(2);
                    expect((f$ as any)._deriver).toBeUndefined();

                    expect(f$.get()).toBe('asynchronous value');
                    expect(connectionChanges).toBe(2);
                });

                describe('inside transactions', () => {
                    it('should work according to Schrödinger\'s observation rules', () => {
                        const f$ = startTest({ once: true });

                        txn(() => {
                            a$.set('a');
                            expect(f$.value).toBe('a');
                            a$.set('b');
                            expect(f$.value).toBe('a');
                            a$.set('c');
                            expect(f$.value).toBe('a');
                        });

                        a$.set('d');

                        shouldHaveReactedOnce('a');

                        stopTest();

                        if (isDerivableAtom(a$)) {

                            a$.unset();

                            const g$ = startTest({ once: true });

                            txn(() => {
                                a$.set('a');
                                a$.set('b');
                                a$.set('c');
                            });

                            a$.set('d');
                            shouldHaveReactedOnce('c');
                            expect(g$.value).toBe('c');
                        }
                    });

                    noRollbackSupport || it('should rollback a once observation when a transaction aborts', () => {
                        const f$ = startTest({ once: true });

                        expect(f$.value).toBeUndefined();

                        txn(abort => {
                            a$.set('a');
                            expect(f$.value).toBe('a');
                            a$.set('b');
                            expect(f$.value).toBe('a');
                            abort();
                        });

                        expect(f$.value).toBeUndefined();
                        a$.set('c');
                        expect(f$.value).toBe('c');
                    });
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

                    if (isDerivableAtom(a$)) {
                        a$.unset();
                        shouldNotHaveReacted(unresolved);
                    }
                });

                it('should never present the first state from the returned derivable (asynchronous start)', () => {
                    startTest({ skipFirst: true });
                    shouldNotHaveReacted(unresolved);

                    a$.set('first value');
                    shouldNotHaveReacted(unresolved);

                    a$.set('second value');
                    shouldHaveReactedOnce('second value');

                    a$.set('third value');
                    shouldHaveReactedOnce('third value');

                    if (isDerivableAtom(a$)) {
                        a$.unset();
                        shouldNotHaveReacted(unresolved);
                    }
                });

                describe('inside transactions', () => {
                    it('should work according to Schrödinger\'s observation rules', () => {
                        const f$ = startTest({ skipFirst: true });

                        shouldNotHaveReacted(unresolved);

                        txn(() => {
                            a$.set('a');
                            expect(f$.value).toBeUndefined();
                            a$.set('b');
                            expect(f$.value).toBe('b');
                            a$.set('c');
                            expect(f$.value).toBe('c');
                        });

                        shouldHaveReactedOnce('c');

                        a$.set('d');

                        shouldHaveReactedOnce('d');

                        stopTest();

                        if (isDerivableAtom(a$)) {
                            a$.unset();
                            const g$ = startTest({ skipFirst: true });

                            shouldNotHaveReacted(unresolved);

                            txn(() => {
                                a$.set('a');
                                a$.set('b');
                                a$.set('c');
                                assertDerivableAtom(a$).unset();
                            });

                            shouldNotHaveReacted(unresolved);
                            expect(g$.value).toBeUndefined();

                            a$.set('d');
                            expect(g$.value).toBeUndefined();

                            a$.set('e');
                            expect(g$.value).toBe('e');
                            shouldHaveReactedOnce('e');
                        }
                    });

                    noRollbackSupport || it('should rollback according to Schrödinger\'s observation rules', () => {
                        const f$ = startTest({ skipFirst: true });

                        shouldNotHaveReacted(unresolved);

                        txn(abort => {
                            a$.set('a');
                            expect(f$.value).toBeUndefined();
                            a$.set('b');
                            expect(f$.value).toBe('b');
                            a$.set('c');
                            expect(f$.value).toBe('c');
                            abort();
                        });

                        shouldNotHaveReacted(unresolved);

                        a$.set('a');

                        shouldNotHaveReacted(unresolved);

                        a$.set('b');

                        shouldHaveReactedOnce('b');
                    });

                    noRollbackSupport || it('should not leak skipped state when a transaction rolls back', () => {
                        const f$ = startTest({ skipFirst: true });

                        shouldNotHaveReacted(unresolved);

                        txn(abort => {
                            a$.set('a');
                            expect(f$.value).toBeUndefined();
                            abort();
                        });

                        shouldNotHaveReacted(unresolved);

                        a$.set('b');

                        // If skipped state leaks outside the transaction, we would react here.
                        shouldNotHaveReacted(unresolved);

                        a$.set('c');

                        shouldHaveReactedOnce('c');
                    });
                });
            });

            let currentTest: { reactions: number, value: any, f$: Derivable<any> } | undefined;
            let currentStopper: (() => void) | undefined;
            function startTest(opts: Partial<TakeOptions<string>>) {
                const f$ = a$.take(opts); // .derive(v => v);
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
    });
}
