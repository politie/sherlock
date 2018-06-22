import { expect } from 'chai';
import { SinonFakeTimers, SinonStub, spy, stub, useFakeTimers } from 'sinon';
import { Derivable, State } from '../interfaces';
import { react, shouldHaveReactedOnce, shouldNotHaveReacted } from '../reactor/reactor.spec';
import { unresolved } from '../symbols';
import { basicTransactionsTests } from '../transaction/transaction.spec';
import { config, ErrorWrapper } from '../utils';
import { testDerivable } from './base-derivable.spec';
import { DataSource } from './data-source';
import { derive } from './factories';

describe('derivable/data-source', () => {

    class SimpleDataSource<V> extends DataSource<V> {
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
    context('(lensed)', () => {
        testDerivable(<V>(v: State<V>) =>
            new SimpleDataSource(v === unresolved || v instanceof ErrorWrapper ? v : { value: v })
                .lens<V>({
                    get: obj => obj.value,
                    set: value => ({ value }),
                }),
            false);
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
        class FaultyDataSource extends DataSource<never> {
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
        class Timer extends DataSource<number> {
            readonly startTime = Date.now();

            private intervalId?: NodeJS.Timer;

            calculateCurrentValue() {
                return Math.trunc((Date.now() - this.startTime) / 1000);
            }

            onConnect() {
                expect(this.connected).to.be.true;
                this.intervalId = setInterval(() => this.checkForChanges(), 1000);
            }
            onDisconnect() {
                expect(this.connected).to.be.false;
                clearInterval(this.intervalId!);
            }

            // expose
            connected!: boolean;
            disconnectNow() { super.disconnectNow(); }
        }

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
            beforeEach('connect', () => {
                expect(timer$.onConnect).to.not.have.been.called;
                done = react(timer$);
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
                timer$.disconnectNow();
                expect(timer$.connected).to.be.false;
                expect(timer$.onDisconnect).to.have.been.calledOnce;
                clock.tick(2000);
                shouldHaveReactedOnce(0);
            });

        });
    });

    context('(usecase: clock)', () => {
        function currentTime() { return new Date().toLocaleTimeString('nl-NL'); }

        class Clock extends DataSource<string> {
            calculateCurrentValue() {
                if (this.connected) {
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

    context('(usecase: derivable promise)', () => {
        class DerivablePromise<V> extends DataSource<V> {
            private _value: State<V> = unresolved;

            constructor(work: ((resolve: (v: V) => void, reject: (e: any) => void) => void)) {
                super();
                work(
                    v => {
                        this._value = v;
                        this.checkForChanges();
                    },
                    e => {
                        this._value = new ErrorWrapper(e);
                        this.checkForChanges();
                    },
                );
            }

            calculateCurrentValue() {
                if (this._value instanceof ErrorWrapper) {
                    throw this._value.error;
                }
                return this._value;
            }
        }

        let a$: DerivablePromise<number>;
        let b$: DerivablePromise<number>;
        let c$: Derivable<number>;
        beforeEach('create the derivable promises', () => {
            a$ = new DerivablePromise(resolve => {
                setTimeout(() => resolve(15), 500);
            });
            b$ = new DerivablePromise(resolve => {
                setTimeout(() => resolve(27), 1000);
            });
            c$ = derive(() => a$.get() + b$.get());
        });

        it('should expose the result asynchronously', () => {
            expect(a$.value).to.be.undefined;
            expect(() => a$.get()).to.throw();

            clock.tick(500);
            expect(a$.value).to.equal(15);
            expect(a$.get()).to.equal(15);
        });

        it('should propagate resolved status', () => {
            expect(c$.resolved).to.be.false;
            clock.tick(500);
            expect(c$.resolved).to.be.false;
            clock.tick(500);
            expect(c$.resolved).to.be.true;

            expect(c$.get()).to.equal(42);
        });

        it('should propagate error status', async () => {
            const e$ = new DerivablePromise<number>((_, reject) => setTimeout(() => reject(new Error('my error')), 0));
            const f$ = e$.derive(v => v + 1);

            const promise = f$.toPromise();

            clock.next();

            try {
                await promise;
                throw new Error('should have thrown an error');
            } catch (e) {
                expect(e.message).to.equal('my error');
            }

            expect(f$.value).to.be.undefined;
            expect(() => f$.get()).to.throw('my error');
        });

        context('when used in a reactor', () => {
            it('should only react when all values are available', () => {
                react(c$);

                shouldNotHaveReacted();
                clock.tick(500);
                shouldNotHaveReacted();
                clock.tick(500);
                shouldHaveReactedOnce(42);
            });

            it('should switch from unresolved', () => {
                react(derive(() => c$.getOr('unresolved')));

                shouldHaveReactedOnce('unresolved');
                clock.tick(500);
                shouldNotHaveReacted();
                clock.tick(500);
                shouldHaveReactedOnce(42);
            });
        });
    });
});
