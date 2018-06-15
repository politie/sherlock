import { expect } from 'chai';
import { SinonFakeTimers, SinonStub, spy, stub, useFakeTimers } from 'sinon';
import { basicTransactionsTests } from '../transaction/transaction.spec';
import { setDebugMode } from '../utils';
import { testDerivable } from './base-derivable.spec';
import { DataSource } from './data-source';

describe('derivable/data-source', () => {

    class SimpleDataSource<V> extends DataSource<V> {
        constructor(private currentValue: V) { super(); }
        calculateCurrentValue(): V {
            return this.currentValue;
        }
        protected acceptNewValue(newValue: V) {
            this.currentValue = newValue;
            this.checkForChanges();
        }
    }

    context('(simple)', () => {
        testDerivable(<V>(v: V) => new SimpleDataSource(v), false);
    });
    context('(derived)', () => {
        testDerivable(<V>(v: V) => new SimpleDataSource({ value: v }).derive(obj => obj.value), false);
    });
    context('(lensed)', () => {
        testDerivable(<V>(v: V) => new SimpleDataSource({ value: v }).lens<V>({
            get: obj => obj.value,
            set: value => ({ value }),
        }), false);
    });

    context('(in transactions)', () => {
        basicTransactionsTests(<V>(v: V) => new SimpleDataSource(v), false);
    });

    context('(handling errors)', () => {
        class FlakyDataSource extends DataSource<string> {
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

    describe('#autoCache', () => {
        let clock: SinonFakeTimers;
        beforeEach('use fake timers', () => { clock = useFakeTimers(); });
        afterEach('restore timers', () => { clock.restore(); });

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
        class FaultyDataSource extends DataSource<never> {
            calculateCurrentValue(): never {
                throw new Error('the error');
            }
        }

        before('setDebugMode', () => setDebugMode(true));
        after('resetDebugMode', () => setDebugMode(false));

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

    context('(usecase: timer)', () => {
        class Timer extends DataSource<number> {
            readonly startTime = Date.now();
            calculateCurrentValue() {
                if (this.connected) {
                    setTimeout(() => this.checkForChanges(), 1000);
                }
                return Math.trunc((Date.now() - this.startTime) / 1000);
            }

            // expose
            connected!: boolean;
            onConnect() {
                expect(this.connected).to.be.true;
            }
            onDisconnect() {
                expect(this.connected).to.be.false;
            }
            disconnectNow() { super.disconnectNow(); }
        }

        let clock: SinonFakeTimers;
        beforeEach('use fake timers', () => { clock = useFakeTimers(); });
        afterEach('restore timers', () => { clock.restore(); });

        let timer$: Timer;
        beforeEach('create the timer', () => { timer$ = new Timer(); });

        beforeEach('create spies', () => {
            spy(timer$, 'calculateCurrentValue');
            spy(timer$, 'onConnect');
            spy(timer$, 'onDisconnect');
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
            let reactions: number;
            let value: number;
            beforeEach('connect', () => {
                reactions = 0;
                expect(timer$.onConnect).to.not.have.been.called;
                done = timer$.react(v => {
                    reactions++;
                    value = v;
                });
            });
            afterEach('disconnect', () => {
                done();
                expect(timer$.onDisconnect).to.have.been.calledOnce;
            });

            it('should be connected', () => {
                expect(timer$.connected).to.be.true;
                expect(timer$.onConnect).to.have.been.calledOnce;
                expect(timer$.onDisconnect).to.not.have.been.called;
            });

            it('should react once every second', () => {
                expect(reactions).to.equal(1);
                expect(value).to.equal(0);

                clock.tick(950);

                expect(reactions).to.equal(1);
                expect(value).to.equal(0);

                clock.tick(50);

                expect(reactions).to.equal(2);
                expect(value).to.equal(1);

                clock.tick(1000);

                expect(reactions).to.equal(3);
                expect(value).to.equal(2);
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
                timer$.disconnectNow();
                expect(timer$.connected).to.be.false;
                expect(timer$.onDisconnect).to.have.been.calledOnce;
                clock.tick(2000);
                expect(reactions).to.equal(1);
            });

        });
    });
});
