import { expect } from 'chai';
import { SinonStub, spy, stub } from 'sinon';
import { atom, Atom, BaseDerivable, constant, derive } from '../derivable';
import { $ } from '../derivable/base-derivable.spec';
import { Derivable, ReactorOptions, SettableDerivable } from '../interfaces';
import { atomically } from '../transaction';
import { config } from '../utils';
import { Reactor } from './reactor';

describe('reactor/reactor', () => {
    let a$: Atom<string>;

    beforeEach('create the base atom', () => { a$ = new Atom('a'); });

    it('should simply start unconditionally without any options specified', () => {
        react(a$);

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');
    });

    it('should start when the `from` condition becomes true', () => {
        const from = atom(false);
        react(a$, { from });

        shouldNotHaveReacted();

        from.set(true);

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');
    });

    it('should stop forever when the `until` condition becomes true', () => {
        const until = atom(false);
        react(a$, { until });

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');

        until.set(true);
        a$.set('c');

        shouldNotHaveReacted();

        until.set(false);
        a$.set('d');

        shouldNotHaveReacted();
    });

    it('should stop forever when the returned finisher is called', () => {
        const finish = react(a$);

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');

        finish();
        a$.set('c');

        shouldNotHaveReacted();
    });

    it('should start and stop when the `when` condition becomes true and false respectively', () => {
        const when = atom(false);
        react(a$, { when });

        shouldNotHaveReacted();

        when.set(true);

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');

        when.set(false);
        a$.set('c');

        shouldNotHaveReacted();

        when.set(true);

        shouldHaveReactedOnce('c');
    });

    it('should support changing the atom and the input to `when` atomically', () => {
        react(a$, { when: d => d.is('b') });

        shouldNotHaveReacted();

        a$.set('b');

        // Reacts once because no previous value has been seen by the reactor.
        shouldHaveReactedOnce('b');

        a$.set('a');

        // Doesn't react, because when is now false.
        shouldNotHaveReacted();

        a$.set('b');

        // Doesn't react, because the new value equals the previous value that was seen by the reactor.
        shouldNotHaveReacted();
    });

    it('should accept a function as `from` option', () => {
        react(a$, { from: d => d.is('b') });

        shouldNotHaveReacted();

        a$.set('b');

        shouldHaveReactedOnce('b');

        a$.set('c');

        shouldHaveReactedOnce('c');
    });

    it('should accept a function as `when` option', () => {
        react(a$, { when: d => d.is('c').or(d.is('e')) });

        shouldNotHaveReacted();

        a$.set('b');
        shouldNotHaveReacted();

        a$.set('c');

        shouldHaveReactedOnce('c');

        a$.set('d');

        shouldNotHaveReacted();

        a$.set('e');

        shouldHaveReactedOnce('e');
    });

    it('should accept a function as `until` option', () => {
        react(a$, { until: d => d.is('c') });

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');

        a$.set('c');

        shouldNotHaveReacted();
    });

    it('should support a change and `until` becoming true atomically', () => {
        const until = atom(false);
        react(a$, { until });

        shouldHaveReactedOnce('a');

        atomically(() => {
            a$.set('b');
            until.set(true);
        });

        shouldNotHaveReacted();
    });

    it('should support a change and the finish callback being called atomically', () => {
        const finish = react(a$);

        shouldHaveReactedOnce('a');

        atomically(() => {
            a$.set('b');
            finish();
        });

        shouldNotHaveReacted();
    });

    it('should not be possible to trigger a reaction twice by forcing different values into the `when` option', () => {
        const when = atom(false);
        react(a$, { when });

        shouldNotHaveReacted();

        when.set(true);

        shouldHaveReactedOnce('a');

        when.set(1 as any);

        shouldNotHaveReacted();
    });

    it('should support simple boolean values for the `from`, `when` and `until` option', () => {
        react(a$, { from: false });
        a$.set('b');
        shouldNotHaveReacted();

        react(a$, { when: false });
        a$.set('c');
        shouldNotHaveReacted();

        react(a$, { until: true });
        a$.set('d');
        shouldNotHaveReacted();
    });

    context('with the combined use of `from`, `when` and `until` options', () => {
        let from: SettableDerivable<boolean>;
        let when: SettableDerivable<boolean>;
        let until: SettableDerivable<boolean>;

        beforeEach('create the atoms', () => {
            from = atom(false);
            when = atom(false);
            until = atom(false);
        });

        it('should support all 3 options', () => {
            react(a$, { from, when, until });

            shouldNotHaveReacted();

            from.set(true);

            shouldNotHaveReacted(); // `when` is still false

            when.set(true);

            shouldHaveReactedOnce('a');

            a$.set('b');

            shouldHaveReactedOnce('b');

            when.set(false);
            a$.set('c');

            shouldNotHaveReacted();

            when.set(true);

            shouldHaveReactedOnce('c');

            until.set(true);
            a$.set('d');

            shouldNotHaveReacted();
        });

        it('should support `from` being true from the start', () => {
            from.set(true);

            react(a$, { from, when, until });

            shouldNotHaveReacted();

            when.set(true);

            shouldHaveReactedOnce('a');

            from.set(false);
            a$.set('b');

            shouldHaveReactedOnce('b');
        });

        it('should support `until` being true from the start', () => {
            until.set(true);

            react(a$, { from, when, until });

            shouldNotHaveReacted();

            from.set(true);
            when.set(true);

            shouldNotHaveReacted();
        });

        it('should support the finisher being called before `from` becomes true', () => {
            const finish = react(a$, { from, when, until });
            finish();

            shouldNotHaveReacted();

            from.set(true);
            when.set(true);

            shouldNotHaveReacted();
        });

        it('should support `when` being true from the start', () => {
            when.set(true);

            react(a$, { from, when, until });

            shouldNotHaveReacted();

            from.set(true);

            shouldHaveReactedOnce('a');

            when.set(false);
            a$.set('b');

            shouldNotHaveReacted();
        });

        it('should support `from` and `when` being true from the start', () => {
            from.set(true);
            when.set(true);

            react(a$, { from, when, until });

            shouldHaveReactedOnce('a');

            when.set(false);
            a$.set('b');

            shouldNotHaveReacted();
        });

        it('should support `from` and `until` being true from the start', () => {
            from.set(true);
            until.set(true);

            react(a$, { from, when, until });

            shouldNotHaveReacted();

            when.set(true);

            shouldNotHaveReacted();
        });

        it('should support `when` and `until` being true from the start', () => {
            when.set(true);
            until.set(true);

            react(a$, { from, when, until });

            shouldNotHaveReacted();

            from.set(true);

            shouldNotHaveReacted();
        });

        it('should support `when` and `until` becoming true atomically', () => {
            react(a$, { when, until });

            shouldNotHaveReacted();

            atomically(() => {
                when.set(true);
                until.set(true);
            });

            shouldNotHaveReacted();
        });
    });

    it('should support the `skipFirst` option, skipping the first reaction', () => {
        react(a$, { skipFirst: true });

        shouldNotHaveReacted();

        a$.set('b');

        shouldHaveReactedOnce('b');

        a$.set('c');

        shouldHaveReactedOnce('c');
    });

    it('should support the `once` option, stopping after one reaction', () => {
        react(a$, { once: true });

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldNotHaveReacted();
    });

    it('should support combining `skipFirst` and `once`, skipping 1 and taking 1', () => {
        react(a$, { skipFirst: true, once: true });

        shouldNotHaveReacted();

        a$.set('b');

        shouldHaveReactedOnce('b');

        a$.set('c');

        shouldNotHaveReacted();
    });

    it('should support combining `skipFirst`, `when` and `once`', () => {
        const when = atom(false);
        react(a$, { when, skipFirst: true, once: true });

        shouldNotHaveReacted();

        when.set(true);

        shouldNotHaveReacted();

        a$.set('b');

        shouldHaveReactedOnce('b');

        a$.set('c');

        shouldNotHaveReacted();
    });

    it('should support starting a new reaction on a derivation after a previous reaction stopped', () => {
        const until = atom(false);
        const d$ = a$.derive(v => v);
        react(d$, { until });

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldHaveReactedOnce('b');

        until.set(true);
        until.set(false);

        shouldNotHaveReacted();

        react(d$, { until });

        shouldHaveReactedOnce('b');

        a$.set('c');

        shouldHaveReactedOnce('c');
    });

    context('with unresolved values', () => {
        it('should not react until resolved', () => {
            a$.unset();

            react(a$);

            shouldNotHaveReacted();

            a$.set('a');

            shouldHaveReactedOnce('a');
        });

        it('should not react when the derivable resolves again to the same value as before', () => {
            react(a$);
            shouldHaveReactedOnce('a');

            a$.unset();

            shouldNotHaveReacted();

            a$.set('a');

            shouldNotHaveReacted();
        });

        it('should start when the `from` condition becomes true and the value is resolved', () => {
            const from = atom(false);
            react(a$, { from });

            shouldNotHaveReacted();

            a$.unset();
            from.set(true);

            shouldNotHaveReacted();

            a$.set('a');

            shouldHaveReactedOnce('a');

            a$.set('b');

            shouldHaveReactedOnce('b');
        });

        it('should respect the `when` condition but still only react on real values', () => {
            const when = atom(false);
            react(a$, { when });

            shouldNotHaveReacted();

            a$.unset();
            when.set(true);

            shouldNotHaveReacted();

            a$.set('a');

            shouldHaveReactedOnce('a');

            a$.unset();

            shouldNotHaveReacted();

            when.set(false);
            a$.set('c');

            shouldNotHaveReacted();

            when.set(true);

            shouldHaveReactedOnce('c');
        });

        it('should support changing the atom and the input to `when` atomically', () => {
            react(a$, { when: d => d.is('b') });

            a$.unset();

            shouldNotHaveReacted();

            a$.set('b');

            // Reacts once because no previous value has been seen by the reactor.
            shouldHaveReactedOnce('b');

            a$.unset();

            // Doesn't react, because when is now false.
            shouldNotHaveReacted();

            a$.set('b');

            // Doesn't react, because the new value equals the previous value that was seen by the reactor.
            shouldNotHaveReacted();
        });

        it('should support unresolved values for the `from`, `when` and `until` option', () => {
            react(a$, { from: constant.unresolved() });
            a$.set('b');
            shouldNotHaveReacted();

            react(a$, { when: constant.unresolved() });
            a$.set('c');
            shouldNotHaveReacted();

            react(a$, { until: constant.unresolved() });
            a$.set('d');
            shouldNotHaveReacted();
        });

        it('should wait until all options are resolved before starting the reaction', () => {
            const from = atom.unresolved<boolean>();
            const when = atom.unresolved<boolean>();
            const until = atom.unresolved<boolean>();

            react(a$, { from, when, until });

            shouldNotHaveReacted();

            from.set(true);

            shouldNotHaveReacted();

            when.set(true);

            shouldNotHaveReacted();

            until.set(false);

            shouldHaveReactedOnce('a');
        });

        it('should support the `skipFirst` option, skipping the first real value', () => {
            a$.unset();

            react(a$, { skipFirst: true });

            shouldNotHaveReacted();

            a$.set('a');

            shouldNotHaveReacted();

            a$.set('b');

            shouldHaveReactedOnce('b');

            a$.set('c');

            shouldHaveReactedOnce('c');
        });

        it('should support the `once` option, stopping after the first real value', () => {
            a$.unset();

            react(a$, { once: true });

            shouldNotHaveReacted();

            a$.set('a');

            shouldHaveReactedOnce('a');

            a$.unset();
            a$.set('b');

            shouldNotHaveReacted();
        });
    });

    class TestReactor<V> extends Reactor<V> { constructor(p: BaseDerivable<V>, r: (value: V) => void) { super(p, e => { throw e; }, r); } }

    it('should not generate a stacktrace on instantiation', () => {
        expect(new TestReactor($(a$), () => 0).creationStack).to.be.undefined;
    });

    context('in debug mode', () => {
        before('setDebugMode', () => { config.debugMode = true; });
        after('resetDebugMode', () => { config.debugMode = false; });

        let consoleErrorStub: SinonStub;
        beforeEach('stub console.error', () => { consoleErrorStub = stub(console, 'error'); });
        afterEach('restore console.error', () => { consoleErrorStub.restore(); });

        it('should generate a stacktrace on instantiation', () => {
            expect(new TestReactor($(a$), () => 0).creationStack).to.be.a('string');
        });

        it('should augment the error with the recorded stacktrace', () => {
            const reactor = new TestReactor($(a$), () => { throw new Error('the Error'); });
            try {
                reactor._start();
            } catch (e) {
                reactor._stop();
                expect(e.stack).to.contain('the Error');
                expect(e.stack).to.contain(reactor.creationStack!);
                return;
            }
            throw new Error('Reactor did not throw');
        });
    });
});

describe('reactor/reactor with cycles', () => {
    it('should throw on infinite cycles', () => {
        const a$ = atom(1);
        const b$ = atom(1);

        react(b$);

        shouldHaveReactedOnce(1);

        // No cycle yet...
        a$.react(a => b$.swap(b => b + a));

        shouldHaveReactedOnce(2);

        a$.set(2);

        shouldHaveReactedOnce(4);

        expect(() => b$.react(b => a$.set(b))).to.throw('Too deeply nested synchronous cyclical reactions disallowed. Use setImmediate.');
    });

    it('should not throw if the cycles reaches equilibrium within 100 iterations', () => {

        expect(iters(99)).to.equal(99);

        expect(() => iters(100)).to.throw('cyclical reactions');

        function iters(n: number) {
            const a$ = atom(0);
            a$.react(a => a$.set(Math.min(a + 1, n)));
            return a$.get();
        }
    });

    it('should not react if an earlier reactor changes the value back to the previous value', () => {
        const a$ = atom('a');

        // This would be really annoying of course.
        a$.react(() => a$.set('a'));

        react(a$);

        shouldHaveReactedOnce('a');

        a$.set('b');

        shouldNotHaveReacted();
    });
});

describe('reactor/reactor error handling', () => {
    let a$: SettableDerivable<string>;
    let d$: Derivable<string>;

    beforeEach('setup atom and derivable', () => {
        a$ = atom('no error');
        d$ = a$
            .derive(v => v)     // other derive steps in the chain should have no effect on the error propagation
            .derive(v => {
                if (v === 'error in derivation') {
                    throw new Error(v);
                }
                return v;
            })
            .derive(v => v);    // other derive steps in the chain should have no effect on the error propagation
    });

    context('with no error handler provided', () => {
        context('when an error occurs in any derivation', () => {
            beforeEach('start the reactor', () => {
                react(d$);
                shouldHaveReactedOnce('no error');
            });

            it('should throw on Atom#set', () => {
                expect(() => a$.set('error in derivation')).to.throw('error in derivation');
            });

            it('should stop the reactor', () => {
                a$.set('whatever');
                shouldHaveReactedOnce('whatever');

                try { a$.set('error in derivation'); } catch (e) { /**/ }
                shouldNotHaveReacted();

                a$.set('no error at all!');
                shouldNotHaveReacted();
            });
        });

        context('when an error occurs in any reactor', () => {
            let latestValue: string;
            beforeEach('start an unstable reactor', () => {
                d$.react(v => {
                    latestValue = v;
                    if (v === 'error in reactor') {
                        throw new Error(v);
                    }
                });
            });

            it('should throw on Atom#set', () => {
                expect(() => a$.set('error in reactor')).to.throw('error in reactor');
            });

            it('should stop the reactor', () => {
                a$.set('whatever');
                expect(latestValue).to.equal('whatever');

                try { a$.set('error in reactor'); } catch (e) {/**/ }
                expect(latestValue).to.equal('error in reactor');

                a$.set('back to normal?');
                expect(latestValue).to.equal('error in reactor');
            });

            it('will result in unexpected behavior of other reactors, and therefore your application', () => {
                react(d$);
                shouldHaveReactedOnce('no error');

                try { a$.set('error in reactor'); } catch (e) {/**/ }
                // use error handlers on unstable reactors to prevent this behavior
                shouldNotHaveReacted();

                a$.set('unstable reactors are bad');
                shouldHaveReactedOnce('unstable reactors are bad');
            });
        });
    });

    context('with an error handler', () => {
        context('when an error occurs in any derivation', () => {
            let onError: sinon.SinonStub;
            beforeEach('start the reactor', () => {
                onError = stub();
                react(d$, { onError });
                shouldHaveReactedOnce('no error');
                shouldNotHaveBeenCalled(onError);
            });

            it('should not throw on Atom#set', () => {
                expect(() => a$.set('error in derivation')).not.to.throw();
            });

            it('should call the errorhandler with the error', () => {
                a$.set('error in derivation');
                expect(onError).to.have.been.calledOnce;
                const err = onError.firstCall.args[0];
                expect(err).to.be.an('error');
                expect(err.message).to.equal('error in derivation');

                onError.resetHistory();
                a$.set('no error at all!');
                expect(onError).to.not.have.been.called;
            });

            it('should not stop the reactor', () => {
                a$.set('whatever');
                shouldHaveReactedOnce('whatever');

                a$.set('error in derivation');
                shouldNotHaveReacted();

                a$.set('no error at all!');
                shouldHaveReactedOnce('no error at all!');
            });

            it('should stop the reactor when the stop callback is used', () => {
                onError.callsArg(1);
                a$.set('whatever');
                shouldHaveReactedOnce('whatever');

                a$.set('error in derivation');
                shouldNotHaveReacted();

                a$.set('no error at all!');
                shouldNotHaveReacted();
            });
        });

        context('when an error occurs in any reactor', () => {
            let onError: sinon.SinonStub;
            let latestValue: string;
            beforeEach('start an unstable reactor', () => {
                onError = stub();
                d$.react(v => {
                    latestValue = v;
                    if (v === 'error in reactor') {
                        throw new Error(v);
                    }
                }, { onError });
            });

            it('should not throw on Atom#set', () => {
                expect(() => a$.set('error in reactor')).not.to.throw();
            });

            it('should call the errorhandler with the error', () => {
                a$.set('error in reactor');
                expect(onError).to.have.been.calledOnce;
                const err = onError.firstCall.args[0];
                expect(err).to.be.an('error');
                expect(err.message).to.equal('error in reactor');

                onError.resetHistory();
                a$.set('no error at all!');
                expect(onError).to.not.have.been.called;
            });

            it('should not stop the reactor', () => {
                a$.set('whatever');
                expect(latestValue).to.equal('whatever');

                a$.set('error in reactor');
                expect(latestValue).to.equal('error in reactor');

                a$.set('back to normal?');
                expect(latestValue).to.equal('back to normal?');
            });

            it('should stop the reactor when the stop callback is used', () => {
                onError.callsArg(1);
                a$.set('whatever');
                expect(latestValue).to.equal('whatever');

                a$.set('error in reactor');
                expect(latestValue).to.equal('error in reactor');

                a$.set('back to normal?');
                expect(latestValue).to.equal('error in reactor');
            });

            it('should have no effect on other reactors', () => {
                react(d$);
                shouldHaveReactedOnce('no error');

                a$.set('error in reactor');
                shouldHaveReactedOnce('error in reactor');

                a$.set('conditions are normal');
                shouldHaveReactedOnce('conditions are normal');
            });
        });
    });
});

describe('reactor/reactor efficiency', () => {
    it('should only call derivers on actual changes', () => {
        const name$ = atom('Pete');
        const karma$ = atom(2);
        const lengthDeriver = spy((name: string) => name.length + karma$.get());
        const length$ = name$.derive(lengthDeriver);
        const isHeroDeriver = spy((length: number) => length > 8);
        const isHero$ = length$.map(isHeroDeriver);
        const shout$ = name$.derive(name => isHero$.get() ? name.toUpperCase() : name.toLowerCase());

        react(shout$);

        shouldHaveReactedOnce('pete');
        shouldHaveBeenCalledOnce(lengthDeriver);
        shouldHaveBeenCalledOnce(isHeroDeriver);

        name$.set('Luke');

        shouldHaveReactedOnce('luke');
        shouldHaveBeenCalledOnce(lengthDeriver);
        shouldNotHaveBeenCalled(isHeroDeriver);

        atomically(() => {
            name$.set('George');
            karma$.set(0);
        });

        shouldHaveReactedOnce('george');
        shouldHaveBeenCalledOnce(lengthDeriver);
        shouldNotHaveBeenCalled(isHeroDeriver);

        name$.set('Frederick');

        shouldHaveReactedOnce('FREDERICK');
        shouldHaveBeenCalledOnce(lengthDeriver);
        shouldHaveBeenCalledOnce(isHeroDeriver);
    });

    it('should not do unnecessary work when switching between dependencies', () => {
        const switcher$ = atom(true);
        const path1Derivation = spy((v: string) => v + ' from path 1');
        const path2Derivation = spy((v: string) => v + ' from path 2');
        const atom1 = atom('a');
        const atom2 = atom('b');
        const path1 = atom1.map(path1Derivation);
        const path2 = atom2.map(path2Derivation);

        react(derive(() => switcher$.get() ? path1.get() : path2.get()));

        shouldHaveReactedOnce('a from path 1');
        shouldHaveBeenCalledOnce(path1Derivation);
        shouldNotHaveBeenCalled(path2Derivation);

        atom1.set('c');
        atom2.set('d');
        shouldHaveReactedOnce('c from path 1');
        shouldHaveBeenCalledOnce(path1Derivation);
        shouldNotHaveBeenCalled(path2Derivation);

        switcher$.set(false);
        shouldHaveReactedOnce('d from path 2');
        shouldNotHaveBeenCalled(path1Derivation);
        shouldHaveBeenCalledOnce(path2Derivation);

        atom1.set('e');
        atom2.set('f');
        shouldHaveReactedOnce('f from path 2');
        shouldNotHaveBeenCalled(path1Derivation);
        // Need to call path2Derivation again because path2 was completely disconnected on switching.
        shouldHaveBeenCalledOnce(path2Derivation);
    });
});

let currentReactorTest: { reactions: number, value: any } | undefined;
export function react<V>(d: Derivable<V>, opts?: Partial<ReactorOptions<V>>) {
    currentReactorTest = { reactions: 0, value: undefined as any as V };
    return d.react(v => {
        currentReactorTest!.reactions++;
        currentReactorTest!.value = v;
    }, opts);
}

afterEach(() => currentReactorTest = undefined);

export function shouldNotHaveReacted() {
    expect(currentReactorTest!.reactions).to.equal(0, 'should not have reacted');
    currentReactorTest!.reactions = 0;
}

export function shouldHaveReactedOnce(value: any) {
    expect(currentReactorTest!.reactions).to.equal(1, `should have reacted once`);
    expect(currentReactorTest!.value).to.equal(value);
    currentReactorTest!.reactions = 0;
}

function shouldHaveBeenCalledOnce(s: sinon.SinonSpy) {
    expect(s).to.have.been.calledOnce;
    s.resetHistory();
}

function shouldNotHaveBeenCalled(s: sinon.SinonSpy) {
    expect(s).to.not.have.been.called;
}
