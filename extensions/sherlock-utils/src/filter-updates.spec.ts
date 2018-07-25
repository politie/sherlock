import { _internal, atom, Derivable, DerivableAtom, State, transact } from '@politie/sherlock';
import { expect } from 'chai';
import { spy } from 'sinon';
import { filterUpdates, FilterUpdatesOptions } from './filter-updates';

const { unresolved } = _internal.symbols;

describe('sherlock-utils/filterUpdates', () => {
    let a$: DerivableAtom<string>;

    beforeEach('create the base atom', () => { a$ = atom.unresolved(); });

    context('not connected get with', () => {
        context('no options', () => {
            it('should always forward a get request when not connected', () => {
                spy(a$, 'getState');
                const f$ = filterUpdates(a$);
                expect(a$.getState).to.not.have.been.called;
                expect(f$.resolved).to.be.false;
                expect(a$.getState).to.have.been.calledOnce;
                a$.set('boo');
                expect(f$.value).to.equal('boo');
                expect(a$.getState).to.have.been.calledTwice;
            });

            it('should propagate errors', () => {
                const f$ = filterUpdates(a$);
                a$.setError('my error');
                expect(f$.value).to.be.undefined;
                expect(f$.error).to.equal('my error');
                a$.set('a');
                expect(f$.value).to.equal('a');
                expect(f$.error).to.be.undefined;
            });
        });

        describe('from', () => {
            it('should be unresolved if `from` is false', () => {
                a$.set('value');
                const f$ = filterUpdates(a$, { from: false });
                expect(f$.resolved).to.be.false;
            });

            it('should be unresolved while `from` is false', () => {
                a$.set('value');
                const from = atom(false);
                const f$ = filterUpdates(a$, { from });
                expect(f$.resolved).to.be.false;
                from.set(true);
                expect(f$.value).to.equal('value');
                from.unset();
                expect(f$.resolved).to.be.false;
                from.set(false);
                expect(f$.resolved).to.be.false;
            });

            it('should propagate errors iff `from` is true', () => {
                a$.setError('my error');
                const from = atom(false);
                const f$ = filterUpdates(a$, { from });
                expect(f$.error).to.be.undefined;
                from.set(true);
                expect(f$.error).to.equal('my error');
                from.unset();
                expect(f$.error).to.be.undefined;
                from.set(false);
                expect(f$.error).to.be.undefined;
            });
        });

        describe('until', () => {
            it('should be unresolved if `until` is true', () => {
                a$.set('value');
                const f$ = filterUpdates(a$, { until: true });
                expect(f$.resolved).to.be.false;
            });

            it('should be unresolved while `until` is true', () => {
                a$.set('value');
                const until = atom(false);
                const f$ = filterUpdates(a$, { until });
                expect(f$.value).to.equal('value');
                until.set(true);
                expect(f$.resolved).to.be.false;
                until.unset();
                expect(f$.resolved).to.be.false;
                until.set(false);
                expect(f$.value).to.equal('value');
            });

            it('should propagate errors iff `until` is false', () => {
                a$.setError('an error');
                const until = atom(false);
                const f$ = filterUpdates(a$, { until });
                expect(f$.error).to.equal('an error');
                until.set(true);
                expect(f$.error).to.be.undefined;
                until.unset();
                expect(f$.error).to.be.undefined;
                until.set(false);
                expect(f$.error).to.equal('an error');
            });
        });

        describe('when', () => {
            it('should be unresolved if `when` is false', () => {
                a$.set('value');
                const f$ = filterUpdates(a$, { when: false });
                expect(f$.resolved).to.be.false;
            });

            it('should be unresolved while `when` is false', () => {
                a$.set('value');
                const when = atom(false);
                const f$ = filterUpdates(a$, { when });
                expect(f$.resolved).to.be.false;
                when.set(true);
                expect(f$.value).to.equal('value');
                when.unset();
                expect(f$.resolved).to.be.false;
                when.set(false);
                expect(f$.resolved).to.be.false;
            });

            it('should propagate errors iff `when` is true', () => {
                a$.setError('foo');
                const when = atom(false);
                const f$ = filterUpdates(a$, { when });
                expect(f$.error).to.be.undefined;
                when.set(true);
                expect(f$.error).to.equal('foo');
                when.unset();
                expect(f$.error).to.be.undefined;
                when.set(false);
                expect(f$.error).to.be.undefined;
            });
        });

        describe('once', () => {
            it('should have no impact on the output', () => {
                a$.set('value');
                const f$ = filterUpdates(a$, { once: true });
                expect(f$.value).to.equal('value');
                expect(f$.value).to.equal('value');

                a$.setError('bar');
                expect(f$.error).to.equal('bar');
            });
        });

        describe('skipFirst', () => {
            it('should always be unresolved', () => {
                a$.set('value');
                const f$ = filterUpdates(a$, { skipFirst: true });
                expect(f$.resolved).to.be.false;
                expect(f$.resolved).to.be.false;

                a$.setError('baz');
                expect(f$.resolved).to.be.false;
            });
        });
    });

    context('connected, shaping the flow using', () => {
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
                shouldHaveReactedOnce(new _internal.ErrorWrapper('error'));
                shouldNotHaveReacted(new _internal.ErrorWrapper('error'));
            });

            it('should disconnect from the `from` derivable when it becomes true', () => {
                from.set(false);
                startTest({ from });

                expect(a$.connected).to.be.false;
                expect(from.connected).to.be.true;

                from.set(true);

                expect(a$.connected).to.be.true;
                expect(from.connected).to.be.false;
            });

            context('inside transactions', () => {
                it('should be live', () => {
                    from.set(false);
                    a$.set('a');
                    const f$ = startTest({ from });

                    transact(() => {
                        expect(f$.resolved).to.be.false;

                        // Works as expected:
                        from.set(true);
                        expect(f$.value).to.equal('a');

                        // But we can undo our work because we are inside a transaction.
                        from.set(false);
                        expect(f$.resolved).to.be.false;
                    });

                    expect(f$.resolved).to.be.false;
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
                shouldHaveReactedOnce(new _internal.ErrorWrapper('my error'));

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

                expect(a$.connected).to.be.true;
                expect(until.connected).to.be.true;

                until.set(true);

                expect(a$.connected).to.be.false;
                expect(until.connected).to.be.false;
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

            context('inside transactions', () => {
                it('should be live', () => {
                    until.set(false);
                    a$.set('a');
                    const f$ = startTest({ until });

                    transact(() => {
                        expect(f$.value).to.equal('a');

                        a$.set('b');
                        expect(f$.value).to.equal('b');

                        // Always represents state that should be visible after the transaction:
                        until.set(true);
                        a$.set('c');
                        expect(f$.value).to.equal('a');

                        // But we can undo everything because we are inside a transaction.
                        until.set(false);
                        expect(f$.value).to.equal('c');

                        until.set(true);
                    });

                    expect(f$.value).to.equal('a');
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
                shouldHaveReactedOnce(new _internal.ErrorWrapper('my error'));

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

                expect(a$.connected).to.be.true;
                expect(when.connected).to.be.true;

                when.set(false);

                expect(a$.connected).to.be.false;
                expect(when.connected).to.be.true;
            });

            context('inside transactions', () => {
                it('should be live', () => {
                    a$.set('a');
                    const f$ = startTest({ when });

                    when.set(true);
                    expect(f$.value).to.equal('a');

                    transact(() => {
                        a$.set('b');
                        expect(f$.value).to.equal('b');

                        // Always represents state that should be visible after the transaction:
                        when.set(false);
                        expect(f$.value).to.equal('a');

                        when.set(true);
                        expect(f$.value).to.equal('b');

                        when.set(false);
                    });

                    expect(f$.value).to.equal('a');
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
                    const f$ = startTest({ when: d => d.get().length > 3 });

                    shouldNotHaveReacted(unresolved);

                    a$.set('abc');
                    expect(f$.value).to.be.undefined;
                    a$.set('abcd');
                    expect(f$.value).to.be.equal('abcd');

                    transact(() => {
                        a$.set('abcde');
                        expect(f$.value).to.be.equal('abcde');
                        a$.set('ab');
                        expect(f$.value).to.be.equal('abcd');
                        a$.unset();
                        expect(f$.value).to.be.equal('abcd');
                    });

                    expect(f$.value).to.be.equal('abcd');
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

            it('should not count an error as a value and thus not stop after the first', () => {
                startTest({ once: true });
                shouldNotHaveReacted(unresolved);

                a$.setError('my error');
                shouldHaveReactedOnce(new _internal.ErrorWrapper('my error'));

                a$.setError('another error');
                shouldHaveReactedOnce(new _internal.ErrorWrapper('another error'));

                a$.set('a');
                shouldHaveReactedOnce('a');
                a$.set('b');
                shouldNotHaveReacted('a');
            });

            it('should support a synchronous `once` without maintaining garbage', () => {
                a$.set('synchronous value');
                let connectionChanges = 0;
                a$.connected$.react(() => connectionChanges++, { skipFirst: true });

                const f$ = filterUpdates(a$, { once: true }).autoCache();

                expect(connectionChanges).to.equal(0);
                expect(f$.get()).to.equal('synchronous value');
                expect(connectionChanges).to.equal(2);
                expect(f$.get()).to.equal('synchronous value');
                expect(connectionChanges).to.equal(2);

                expect((f$ as any)._baseConnectionStopper).to.be.undefined;
            });

            it('should disconnect after the first value', () => {
                let connectionChanges = 0;
                a$.connected$.react(() => connectionChanges++, { skipFirst: true });

                const f$ = filterUpdates(a$, { once: true }).autoCache();

                expect(connectionChanges).to.equal(0);
                expect(f$.resolved).to.be.false;
                expect(connectionChanges).to.equal(1);
                expect((f$ as any)._baseConnectionStopper).to.be.a('function');

                a$.set('asynchronous value');
                expect(connectionChanges).to.equal(2);
                expect((f$ as any)._baseConnectionStopper).to.be.undefined;

                expect(f$.get()).to.equal('asynchronous value');
                expect(connectionChanges).to.equal(2);
            });

            it('should consider a transaction as one big update', () => {
                const f$ = startTest({ once: true });

                transact(() => {
                    a$.set('a');
                    expect(f$.value).to.equal('a');
                    a$.set('b');
                    expect(f$.value).to.equal('b');
                    a$.set('c');
                    expect(f$.value).to.equal('c');
                });

                shouldHaveReactedOnce('c');
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
                shouldNotHaveReacted('third value');
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

                a$.unset();
                shouldNotHaveReacted('third value');
            });
        });
    });

    let currentTest: { reactions: number, value: any, f$: Derivable<any> } | undefined;
    function startTest(opts?: FilterUpdatesOptions<string>) {
        const f$ = filterUpdates(a$, opts);
        currentTest = { reactions: 0, value: undefined, f$ };
        const reaction = (v: any) => {
            currentTest!.reactions++;
            currentTest!.value = v;
        };
        f$.react(reaction, { onError: err => reaction(new _internal.ErrorWrapper(err)) });
        return f$;
    }

    afterEach(() => currentTest = undefined);

    function shouldNotHaveReacted(currentValue: State<any>) {
        expect(currentTest!.reactions).to.equal(0, 'should not have reacted');
        expect(currentTest!.f$.getState()).to.deep.equal(currentValue);
        currentTest!.reactions = 0;
    }

    function shouldHaveReactedOnce(value: any) {
        expect(currentTest!.reactions).to.equal(1, `should have reacted once`);
        expect(currentTest!.value).to.deep.equal(value);
        expect(currentTest!.f$.getState()).to.deep.equal(value);
        currentTest!.reactions = 0;
    }
});
