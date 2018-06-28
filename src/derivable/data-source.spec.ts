import { expect } from 'chai';
import { SinonFakeTimers, SinonStub, spy, stub, useFakeTimers } from 'sinon';
import { State } from '../interfaces';
import { react, shouldHaveReactedOnce, shouldNotHaveReacted } from '../reactor/reactor.spec';
import { connect, disconnect, unresolved } from '../symbols';
import { basicTransactionsTests } from '../transaction/transaction.spec';
import { config, ErrorWrapper } from '../utils';
import { testDerivable } from './base-derivable.spec';
import { PullDataSource } from './data-source';

describe('derivable/data-source', () => {

    // Using PullDataSource to simulate an Atom, a bit contrived of course.
    class SimpleDataSource<V> extends PullDataSource<V> {
        constructor(private _value: State<V>) { super(); }
        calculateCurrentValue() {
            return this._value;
        }
        protected acceptNewValue(newValue: V) {
            this._value = newValue;
            this.checkForChanges();
        }
    }

    context('(simple)', () => {
        testDerivable(v => new SimpleDataSource(v), false);
    });
    context('(derived)', () => {
        testDerivable(v => new SimpleDataSource(v === unresolved || v instanceof ErrorWrapper ? v : { value: v }).derive(obj => obj.value), false);
    });
    context('(mapped)', () => {
        testDerivable(v => new SimpleDataSource(v === unresolved || v instanceof ErrorWrapper ? v : { value: v }).map(obj => obj.value), true);
    });
    context('(lensed)', () => {
        testDerivable(<V>(v: State<V>) =>
            new SimpleDataSource(v === unresolved || v instanceof ErrorWrapper ? v : { value: v })
                .map<V>(
                    obj => obj.value,
                    value => ({ value }),
            ),
            true);
    });

    context('(in transactions)', () => {
        basicTransactionsTests(<V>(v: V) => new SimpleDataSource(v), false);
    });

    context('(handling errors)', () => {
        class FlakyDataSource extends PullDataSource<string> {
            shouldThrow = false;
            calculateCurrentValue() {
                if (this.shouldThrow) {
                    throw new Error('the error');
                } else {
                    return 'a value';
                }
            }
            checkForChanges() { super.checkForChanges(); }
        }

        it('should cache thrown errors to rethrow them on multiple accesses until the derivation produces a new result', () => {
            const ds$ = new FlakyDataSource().autoCache();
            spy(ds$, 'calculateCurrentValue');
            expect(ds$.get(), 'first time').to.equal('a value');
            expect(ds$.get(), 'second time').to.equal('a value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
            ds$.shouldThrow = true;
            ds$.checkForChanges();
            expect(() => ds$.get(), 'first time').to.throw('the error');
            expect(() => ds$.get(), 'second time').to.throw('the error');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
            ds$.shouldThrow = false;
            ds$.checkForChanges();
            expect(ds$.get(), 'first time').to.equal('a value');
            expect(ds$.get(), 'second time').to.equal('a value');
            expect(ds$.calculateCurrentValue).to.have.been.calledThrice;
        });

        it('should allow error objects as valid values', () => {
            const theError = new Error('the error');
            const ds$ = new SimpleDataSource(theError).autoCache();
            spy(ds$, 'calculateCurrentValue');
            expect(ds$.get(), 'first time').to.equal(theError);
            expect(ds$.get(), 'second time').to.equal(theError);
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
        });

    });

    let clock: SinonFakeTimers;
    beforeEach('use fake timers', () => { clock = useFakeTimers(); });
    afterEach('restore timers', () => { clock.restore(); });

    describe('#autoCache', () => {
        let ds$: SimpleDataSource<string>;
        beforeEach('create the datasource', () => {
            ds$ = new SimpleDataSource('value');
            spy(ds$, 'calculateCurrentValue');
            ds$.autoCache();
        });

        it('should automatically cache the value of the Derivable the first time in a tick', () => {
            expect(ds$.calculateCurrentValue).to.not.have.been.called;
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
            expect(ds$.get()).to.equal('value');
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
        });

        it('should stop the cache after the tick', () => {
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            clock.tick(0);

            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;

            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
        });

        it('should keep the value updated', () => {
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            ds$.set('another value');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
            expect(ds$.get()).to.equal('another value');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
            expect(ds$.get()).to.equal('another value');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
        });

        it('should start a reactor without recalculation', () => {
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            const received: string[] = [];
            ds$.react(received.push.bind(received));
            expect(received).to.deep.equal(['value']);
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            ds$.set('another value');
            expect(received).to.deep.equal(['value', 'another value']);
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
        });

        it('should not interfere with reactor observation after a tick', () => {
            expect(ds$.get()).to.equal('value');

            const received: string[] = [];
            ds$.react(received.push.bind(received));
            expect(received).to.deep.equal(['value']);

            clock.tick(0);

            ds$.set('another value');
            expect(received).to.deep.equal(['value', 'another value']);
        });

        it('should cache derivables until the next tick even when all existing observers disappear', () => {
            const stopReactor = ds$.react(() => void 0);
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            // Value is already cached, so autoCacheMode has no effect now.
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            stopReactor();

            // Value should still be cached even when all reactors are stopped.
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

            clock.tick(0);

            // Only after the tick, the cache may be released.
            expect(ds$.get()).to.equal('value');
            expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
        });
    });

    context('in debug mode', () => {
        class FaultyDataSource extends PullDataSource<never> {
            calculateCurrentValue(): never {
                throw new Error('the error');
            }
        }

        before('setDebugMode', () => { config.debugMode = true; });
        after('resetDebugMode', () => { config.debugMode = false; });

        let consoleErrorStub: SinonStub;
        beforeEach('stub console.error', () => { consoleErrorStub = stub(console, 'error'); });
        afterEach('restore console.error', () => { consoleErrorStub.restore(); });

        it('should generate a stacktrace on instantiation', () => {
            // tslint:disable-next-line:no-string-literal
            expect(new FaultyDataSource()['_stack']).to.be.a('string');
        });

        it('should log the recorded stacktrace on error', () => {
            const d$ = new FaultyDataSource();
            // tslint:disable-next-line:no-string-literal
            const stack = d$['_stack'];
            expect(() => d$.get()).to.throw('the error');
            expect(console.error).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('the error', stack);
        });
    });

    context('(usecase: simple timer)', () => {
        class Timer extends PullDataSource<number> {
            readonly startTime = Date.now();
            private intervalId?: NodeJS.Timer;

            [connect]() {
                super[connect]();
                this.intervalId = setInterval(() => this.checkForChanges(), 1000);
            }

            [disconnect]() {
                super[disconnect]();
                clearInterval(this.intervalId!);
            }

            calculateCurrentValue() {
                return Math.trunc((Date.now() - this.startTime) / 1000);
            }
        }

        let timer$: Timer;
        beforeEach('create the timer', () => { timer$ = new Timer(); });

        beforeEach('create spies', () => {
            spy(timer$, 'calculateCurrentValue');
            spy(timer$, connect);
            spy(timer$, disconnect);
        });

        it('should throw when trying to set an unsettable datasource', () => {
            expect(() => timer$.set(1)).to.throw('DataSource is not settable');
        });

        it('should calculate a new value everytime when not connected', () => {
            expect(timer$.get()).to.equal(0);
            expect(timer$.calculateCurrentValue).to.have.been.calledOnce;
            expect(timer$.get()).to.equal(0);
            expect(timer$.get()).to.equal(0);
            expect(timer$.calculateCurrentValue).to.have.been.calledThrice;
        });

        context('when used in a reactor', () => {
            let done: () => void;
            beforeEach('connect', () => {
                expect(timer$[connect]).to.not.have.been.called;
                done = react(timer$);
            });
            afterEach('disconnect', () => {
                done();
                expect(timer$[disconnect]).to.have.been.calledOnce;
            });

            it('should be connected', () => {
                expect(timer$.connected).to.be.true;
                expect(timer$[connect]).to.have.been.calledOnce;
                expect(timer$[disconnect]).to.not.have.been.called;
            });

            it('should react once every second', () => {
                shouldHaveReactedOnce(0);

                clock.tick(950);

                shouldNotHaveReacted();

                clock.tick(50);

                shouldHaveReactedOnce(1);

                clock.tick(1000);

                shouldHaveReactedOnce(2);
            });

            it('should cache the value when connected', () => {
                expect(timer$.calculateCurrentValue).to.have.been.calledOnce;
                expect(timer$.get()).to.equal(0);
                expect(timer$.get()).to.equal(0);
                expect(timer$.get()).to.equal(0);
                expect(timer$.calculateCurrentValue).to.have.been.calledOnce;
                clock.tick(1000);
                expect(timer$.get()).to.equal(1);
                expect(timer$.get()).to.equal(1);
                expect(timer$.get()).to.equal(1);
                expect(timer$.calculateCurrentValue).to.have.been.calledTwice;
            });

            it('should allow forceful disconnect', () => {
                timer$[disconnect]();
                expect(timer$.connected).to.be.false;
                clock.tick(2000);
                shouldHaveReactedOnce(0);
            });

        });
    });

    context('(usecase: clock)', () => {
        function currentTime() { return new Date().toLocaleTimeString('nl-NL'); }

        class Clock extends PullDataSource<string> {
            calculateCurrentValue() {
                if (this.connected) {
                    // This way the updates are aligned with the actual seconds that pass.
                    setTimeout(() => {
                        this.checkForChanges();
                    }, 1000 - (Date.now() % 1000));
                }
                return currentTime();
            }
        }

        context('when used in a reactor', () => {
            it('should tell the time', () => {
                const done = react(new Clock);
                shouldHaveReactedOnce(currentTime());
                clock.next();
                shouldHaveReactedOnce(currentTime());
                done();
            });
        });
    });

});
