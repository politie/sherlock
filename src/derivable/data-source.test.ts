import { Derivable, MaybeFinalState } from '../interfaces';
import { react, shouldHaveReactedOnce, shouldNotHaveReacted } from '../reactor/testutils.tests';
import { connect, dependencies, disconnect } from '../symbols';
import { basicTransactionsTests } from '../transaction/transaction.tests';
import { config } from '../utils';
import { testDerivable } from './base-derivable.tests';
import { PullDataSource } from './data-source';
import { atom } from './factories';

describe('derivable/data-source', () => {

    // Using PullDataSource to simulate an Atom, a bit contrived of course.
    class SimpleDataSource<V> extends PullDataSource<V> {
        constructor(private _value: MaybeFinalState<V>) { super(); }
        calculateCurrentValue() {
            return this._value;
        }
        protected acceptNewValue(newValue: V) {
            this._value = newValue;
            this.checkForChanges();
        }
    }

    describe('(simple)', () => {
        testDerivable(a$ => new SimpleDataSource(a$.getMaybeFinalState()), 'settable', 'no-error-augmentation', 'no-rollback-support');
    });
    describe('(derived)', () => {
        testDerivable(
            <V>(a$: Derivable<V>) => new SimpleDataSource(a$.map(val => ({ val })).getMaybeFinalState()).derive(obj => obj.val),
            'no-error-augmentation', 'no-rollback-support',
        );
    });
    describe('(mapped)', () => {
        testDerivable(
            <V>(a$: Derivable<V>) => new SimpleDataSource(a$.map(val => ({ val })).getMaybeFinalState()).map(obj => obj.val),
            'no-error-augmentation', 'no-rollback-support',
        );
    });
    describe('(bi-mapped)', () => {
        testDerivable(
            <V>(a$: Derivable<V>) => new SimpleDataSource(a$.map(val => ({ val })).getMaybeFinalState())
                .map(obj => obj.val, val => ({ val })),
            'settable', 'no-error-augmentation', 'no-rollback-support',
        );
    });

    describe('(in transactions)', () => {
        basicTransactionsTests(<V>(v: V) => new SimpleDataSource(v), false);
    });

    describe('(handling errors)', () => {
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
            jest.spyOn(ds$, 'calculateCurrentValue');
            expect(ds$.get()).toBe('a value');
            expect(ds$.get()).toBe('a value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            ds$.shouldThrow = true;
            ds$.checkForChanges();
            expect(() => ds$.get()).toThrowError('the error');
            expect(() => ds$.get()).toThrowError('the error');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
            ds$.shouldThrow = false;
            ds$.checkForChanges();
            expect(ds$.get()).toBe('a value');
            expect(ds$.get()).toBe('a value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(3);
        });

        it('should allow error objects as valid values', () => {
            const theError = new Error('the error');
            const ds$ = new SimpleDataSource(theError).autoCache();
            jest.spyOn(ds$, 'calculateCurrentValue');
            expect(ds$.get()).toBe(theError);
            expect(ds$.get()).toBe(theError);
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
        });

    });

    beforeEach(() => {
        jest.useFakeTimers();
        let now = Date.now();
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        setInterval(() => now += 100, 100);
    });

    describe('#autoCache', () => {
        let ds$: SimpleDataSource<string>;
        beforeEach(() => {
            ds$ = new SimpleDataSource('value');
            jest.spyOn(ds$, 'calculateCurrentValue');
            ds$.autoCache();
        });

        it('should automatically cache the value of the Derivable the first time in a tick', () => {
            expect(ds$.calculateCurrentValue).not.toHaveBeenCalled();
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(ds$.get()).toBe('value');
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
        });

        it('should stop the cache after the tick', () => {
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(0);

            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);

            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
        });

        it('should keep the value updated', () => {
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            ds$.set('another value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
            expect(ds$.get()).toBe('another value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
            expect(ds$.get()).toBe('another value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
        });

        it('should start a reactor without recalculation', () => {
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            const received: string[] = [];
            ds$.react(v => received.push(v));
            expect(received).toEqual(['value']);
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            ds$.set('another value');
            expect(received).toEqual(['value', 'another value']);
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
        });

        it('should not interfere with reactor observation after a tick', () => {
            expect(ds$.get()).toBe('value');

            const received: string[] = [];
            ds$.react(v => received.push(v));
            expect(received).toEqual(['value']);

            jest.advanceTimersByTime(0);

            ds$.set('another value');
            expect(received).toEqual(['value', 'another value']);
        });

        it('should cache derivables until the next tick even when all existing observers disappear', () => {
            const stopReactor = ds$.react(() => void 0);
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            // Value is already cached, so autoCacheMode has no effect now.
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            stopReactor();

            // Value should still be cached even when all reactors are stopped.
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(0);

            // Only after the tick, the cache may be released.
            expect(ds$.get()).toBe('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
        });
    });

    describe('in debug mode', () => {
        class FaultyDataSource extends PullDataSource<never> {
            calculateCurrentValue(): never {
                throw new Error('the error');
            }
        }

        beforeAll(() => { config.debugMode = true; });
        afterAll(() => { config.debugMode = false; });

        it('should augment an error when it is caught in the datasource', () => {
            const d$ = new FaultyDataSource();
            expect(() => d$.get()).toThrowError('the error');
            try {
                d$.get();
            } catch (e) {
                expect(e.stack).toContain('the error');
                expect(e.stack).toContain(d$.creationStack);
            }
        });
    });

    describe('when using other derivables', () => {
        it('should not polute outer derivation dependency administration', () => {
            const a$ = atom('abc');
            const b$ = new (class extends PullDataSource<string> {
                calculateCurrentValue() {
                    return a$.get();
                }
            });

            const d$ = b$.derive(v => v).autoCache();
            d$.get();
            expect(d$[dependencies]).not.toContain(a$);
        });
    });

    describe('(usecase: simple timer)', () => {
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
        beforeEach(() => {
            timer$ = new Timer();
        });

        beforeEach(() => {
            jest.spyOn(timer$, 'calculateCurrentValue');
            jest.spyOn(timer$, connect as any);
            jest.spyOn(timer$, disconnect as any);
        });

        it('should throw when trying to set an unsettable datasource', () => {
            expect(() => timer$.set(1)).toThrowError('DataSource is not settable');
        });

        it('should calculate a new value everytime when not connected', () => {
            expect(timer$.get()).toBe(0);
            expect(timer$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(timer$.get()).toBe(0);
            expect(timer$.get()).toBe(0);
            expect(timer$.calculateCurrentValue).toHaveBeenCalledTimes(3);
        });

        describe('when used in a reactor', () => {
            let done: () => void;
            beforeEach(() => {
                expect(timer$[connect]).not.toHaveBeenCalled();
                done = react(timer$);
            });
            afterEach(() => {
                done();
                expect(timer$[disconnect]).toHaveBeenCalledTimes(1);
            });

            it('should be connected', () => {
                expect(timer$.connected).toBe(true);
                expect(timer$[connect]).toHaveBeenCalledTimes(1);
                expect(timer$[disconnect]).not.toHaveBeenCalled();
            });

            it('should react once every second', () => {
                shouldHaveReactedOnce(0);

                jest.advanceTimersByTime(950);

                shouldNotHaveReacted();

                jest.advanceTimersByTime(50);

                shouldHaveReactedOnce(1);

                jest.advanceTimersByTime(1000);

                shouldHaveReactedOnce(2);
            });

            it('should cache the value when connected', () => {
                expect(timer$.calculateCurrentValue).toHaveBeenCalledTimes(1);
                expect(timer$.get()).toBe(0);
                expect(timer$.get()).toBe(0);
                expect(timer$.get()).toBe(0);
                expect(timer$.calculateCurrentValue).toHaveBeenCalledTimes(1);
                jest.advanceTimersByTime(1000);
                expect(timer$.get()).toBe(1);
                expect(timer$.get()).toBe(1);
                expect(timer$.get()).toBe(1);
                expect(timer$.calculateCurrentValue).toHaveBeenCalledTimes(2);
            });

            it('should allow forceful disconnect', () => {
                timer$[disconnect]();
                expect(timer$.connected).toBe(false);
                jest.advanceTimersByTime(2000);
                shouldHaveReactedOnce(0);
            });

        });
    });
});
