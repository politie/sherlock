import { fromJS } from 'immutable';
import 'expect-more-jest';
import { Derivable, DerivableAtom, SettableDerivable } from '../interfaces';
import { dependencies, observers, unresolved } from '../symbols';
import { config, ErrorWrapper, FinalWrapper, isError } from '../utils';
import { Atom } from './atom';
import { BaseDerivable } from './base-derivable';
import { Derivation } from './derivation';
import { atom, constant, derive } from './factories';
import { Mapping } from './map';
import { testAccessors } from './mixins/accessors.tests';
import { testBooleanFuncs } from './mixins/boolean-methods.tests';
import { testFallbackTo } from './mixins/fallback-to.tests';
import { testFlatMap } from './mixins/flat-map.tests';
import { testPluck } from './mixins/pluck.tests';
import { testDerivableAtomSetters } from './mixins/setters.tests';
import { testSwap } from './mixins/swap.tests';
import { testTake } from './mixins/take.tests';
import { isDerivableAtom, isSettableDerivable } from './typeguards';

export interface Factories {
    value<V>(value: V, final?: boolean): Derivable<V>;
    unresolved<V>(final?: boolean): Derivable<V>;
    error<V>(error: any, final?: boolean): Derivable<V>;
}

export type DerivableMode = 'final' | 'no-error-augmentation' | 'settable' | 'atom' | 'no-rollback-support';

export function assertSettable<V>(a$: Derivable<V>): SettableDerivable<V> {
    if (!isSettableDerivable(a$)) {
        throw new Error('expected a settable derivable, got: ' + a$);
    }
    return a$;
}

export function assertDerivableAtom<V>(a$: Derivable<V>): DerivableAtom<V> {
    if (!isDerivableAtom(a$)) {
        throw new Error('expected a derivable atom, got: ' + a$);
    }
    return a$;
}

export function testDerivable(factory: Factories | (<V>(atom: Atom<V>) => Derivable<V>), ...modes: DerivableMode[]) {
    const isAtom = modes.includes('atom');
    const isConstant = modes.includes('final');
    const isSettable = modes.includes('settable');
    const noErrorAugmentation = modes.includes('no-error-augmentation');
    const noRollbackSupport = modes.includes('no-rollback-support');

    const factories: Factories = typeof factory === 'object' ? factory : {
        error: <V>(error: any, final?: boolean) => factory(final
            ? new Atom<V>(FinalWrapper.wrap(new ErrorWrapper(error)))
            : new Atom<V>(new ErrorWrapper(error))),
        unresolved: <V>(final?: boolean) => factory(final
            ? new Atom<V>(FinalWrapper.wrap(unresolved))
            : new Atom<V>(unresolved)),
        value: <V>(value: V, final?: boolean) => factory(final
            ? new Atom(FinalWrapper.wrap(value))
            : new Atom(value)),
    };

    testAccessors(factories, isConstant);
    testBooleanFuncs(factories);
    testFallbackTo(factories);
    testFlatMap(factories, isSettable, isAtom);
    testPluck(factories, isSettable, isAtom);
    testTake(factories, isSettable, noRollbackSupport, isAtom);

    if (isSettable) {
        testSwap(factories);
    } else {
        it('should not be settable', () => {
            expect(isSettableDerivable(factories.value(0))).toBe(false);
        });
    }

    if (isAtom) {
        testDerivableAtomSetters(factories);
    } else {
        it('should not be a derivable atom', () => {
            expect(isDerivableAtom(factories.value(0))).toBe(false);
        });
    }

    const oneGigabyte = 1024 * 1024 * 1024;
    const bytes$ = factories.value(oneGigabyte);
    describe('#derive', () => {

        // Created with derive method
        const kiloBytes$ = bytes$.derive(orderUp);

        // Created with derive function
        const megaBytes$ = derive(() => orderUp(kiloBytes$.get()));

        function orderUp(n: number, order = 1): number {
            return order > 0 ? orderUp(n / 1024, order - 1) : n;
        }

        it('should create a derivation', () => {
            expect(kiloBytes$).toBeInstanceOf(Derivation);
            expect(megaBytes$).toBeInstanceOf(Derivation);
            expect(kiloBytes$.get()).toBe(1024 * 1024);
            expect(megaBytes$.get()).toBe(1024);
        });

        it('should be able to derive from more than one derivables', () => {
            const order$ = atom(0);
            const orderName$ = order$.derive(order => ['bytes', 'kilobytes', 'megabytes', 'gigabytes'][order]);
            const size$ = bytes$.derive(orderUp, order$);
            const sizeString$ = derive(() => `${size$.get()} ${orderName$.get()}`);

            expect(sizeString$.get()).toBe(oneGigabyte + ' bytes');
            order$.set(1);
            expect(sizeString$.get()).toBe(1024 * 1024 + ' kilobytes');
            order$.set(2);
            expect(sizeString$.get()).toBe('1024 megabytes');
            order$.set(3);
            expect(sizeString$.get()).toBe('1 gigabytes');
        });

        it('should pass additional arguments unwrapped to the deriver function', () => {
            function add(...ns: number[]) { return ns.reduce((a, b) => a + b, 0); }

            const potentialArgs = [1, 2, 3, 4, 5, 6];
            for (let argCount = 0; argCount < 6; argCount++) {
                const args = potentialArgs.slice(0, argCount);
                const dArgs = args.map(v => constant(v));
                const derivable = factories.value(0);
                expect(derivable.derive(add, ...args).get()).toBe(add(...args));
                expect(derivable.derive(add, ...dArgs).get()).toBe(add(...args));
            }
        });

        it('should propagate unresolved status of any input derivable', () => {
            const value$ = factories.unresolved<string>();
            const otherValue$ = atom('2');
            const yetAnotherValue$ = atom('3');
            const d$ = value$.derive((v, otherValue) => v + otherValue + yetAnotherValue$.get(), otherValue$);

            expect(d$.resolved).toBe(false);

            if (isSettableDerivable(value$)) {
                expect(d$.value).toBeUndefined();
                value$.set('1');
                expect(d$.value).toBe('123');
                otherValue$.unset();
                expect(d$.value).toBeUndefined();
                otherValue$.set('4');
                expect(d$.value).toBe('143');
                yetAnotherValue$.unset();
                expect(d$.value).toBeUndefined();
                yetAnotherValue$.set('5');
                expect(d$.value).toBe('145');
            }
        });
    });

    describe('#map', () => {
        // Created with map method
        const kiloBytes$ = bytes$.map(n => n / 1024);

        it('should create a derivation', () => {
            expect(kiloBytes$).toBeInstanceOf(Mapping);
            expect(kiloBytes$.get()).toBe(1024 * 1024);
        });

        it('should propagate unresolved status of input derivable', () => {
            const value$ = factories.unresolved<string>();
            const d$ = value$.map(v => v + '!');

            expect(d$.resolved).toBe(false);

            if (isSettableDerivable(value$)) {
                expect(d$.value).toBeUndefined();
                value$.set('1');
                expect(d$.value).toBe('1!');
                if (isDerivableAtom(value$)) {
                    value$.unset();
                    expect(d$.value).toBeUndefined();
                }
            }
        });
    });

    describe('#autoCache', () => {
        it('should return the derivable', () => {
            const value$ = factories.value('value');
            expect(value$.autoCache()).toBe(value$);
        });

        it('should be possible to start a reactor on a cached Derivable', () => {
            const value$ = factories.value('value').autoCache();
            const received: string[] = [];
            value$.react(v => received.push(v));
            expect(received).toEqual(['value']);
            if (isSettableDerivable(value$)) {
                value$.set('another value');
                expect(received).toEqual(['value', 'another value']);
            }
        });

        it('should be possible to derive from a cached derivable', () => {
            const value$ = factories.value('value').autoCache();
            const derived$ = value$.derive(v => v + '!');
            expect(derived$.get()).toBe('value!');
            if (isSettableDerivable(value$)) {
                value$.set('another value');
                expect(derived$.get()).toBe('another value!');
            }
        });
    });

    describe('#react', () => {
        let value$: Derivable<string>;
        beforeEach(() => { value$ = factories.value('the value'); });

        it('should react immediately', () => {
            let receivedValue: string | undefined;
            let reactions = 0;
            value$.react(value => { receivedValue = value; reactions++; });
            expect(receivedValue).toBe('the value');
            expect(reactions).toBe(1);
        });

        if (isSettable) {
            let settableValue$: SettableDerivable<string>;
            beforeEach(() => { settableValue$ = assertSettable(value$); });

            it('should react to change', () => {
                let receivedValue: string | undefined;
                let reactions = 0;
                settableValue$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).toBe('the value');
                expect(reactions).toBe(1);
                settableValue$.set('another value');
                expect(receivedValue).toBe('another value');
                expect(reactions).toBe(2);
            });

            it('should not react on no change', () => {
                const derived$ = settableValue$.derive(() => 'constant');
                let receivedValue: string | undefined;
                let reactions = 0;
                derived$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).toBe('constant');
                expect(reactions).toBe(1);
                settableValue$.set('b');
                expect(receivedValue).toBe('constant');
                expect(reactions).toBe(1);
            });

            it('should react on a derivation', () => {
                const base2$ = factories.value('other value');
                const derived$ = settableValue$.derive((a, b) => `${a},${b}`, base2$);
                let receivedValue: string | undefined;
                let reactions = 0;
                derived$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).toBe('the value,other value');
                expect(reactions).toBe(1);
                settableValue$.set('123');
                expect(receivedValue).toBe('123,other value');
                expect(reactions).toBe(2);
                if (isSettableDerivable(base2$)) {
                    base2$.set('456');
                    expect(receivedValue).toBe('123,456');
                    expect(reactions).toBe(3);
                }
            });

            it('should not recompute when no dependency changed', () => {
                // First derived value will have to recompute, because it doesn't know it always returns the same value
                const derived1$ = settableValue$.derive(() => 'constant');
                const computation = jest.fn((v: any) => v);
                // Second derived value should never recompute, because the input never changes.
                const derived2$ = derived1$.derive(computation);

                expect(computation).not.toHaveBeenCalled();

                let receivedValue: string | undefined;
                let reactions = 0;
                derived2$.react(value => { receivedValue = value; reactions++; });

                expect(computation).toHaveBeenCalled();
                expect(computation).toHaveBeenLastCalledWith('constant');
                expect(receivedValue).toBe('constant');
                expect(reactions).toBe(1);

                settableValue$.set('another value');

                expect(computation).toHaveBeenCalled();
                expect(computation).toHaveBeenLastCalledWith('constant');
                expect(receivedValue).toBe('constant');
                expect(reactions).toBe(1);
            });
        }
    });

    describe('#connected$', () => {
        it('should keep observers updated on connected state', () => {
            const d$ = factories.value('a certain value');
            let connected = false;
            d$.connected$.react(v => connected = v);

            expect(connected).toBe(false);

            const stop = derive(() => d$.get()).react(() => 0);
            expect(connected).toBe(!isConstant);

            stop();

            expect(connected).toBe(false);
        });

        it('should not polute any observer administration', () => {
            // Because connection happens during derivations we have to be very careful, side-effects
            // during derivations can result in memory-leaks because of the way our dependency tracking works.
            const base$ = factories.value('value');
            const derived$ = base$.derive(v => v);
            const connected$ = base$.connected$;
            connected$.react(() => 0);
            derived$.react(() => 0);

            // If we don't isolate our side-effects from dependency tracking, derived$ would think it depended on the
            // connected$ atom, which is not true and prevents disconnect from ever being called.
            expect(derived$[dependencies]).toHaveLength(isConstant ? 0 : 1);
        });
    });

    describe('#toPromise', () => {
        let value$: Derivable<string>;
        beforeEach(() => { value$ = factories.value('the value'); });

        it('should resolve immediately when no options are given', async () => {
            expect(await value$.toPromise()).toBe('the value');
        });

        it('should reject on errors in any upstream derivation', async () => {
            const d$ = value$.derive(() => { throw new Error('with a message'); });

            try {
                await d$.toPromise();
            } catch (e) {
                expect(isError(e) && e.message).toBe('with a message');
                return;
            }
            throw new Error('expected promise to reject');
        });

        it('should stop the reactor on an error upstream', async () => {
            const d$ = value$.derive(() => { throw new Error('with a message'); });

            try {
                await d$.toPromise();
            } catch (e) {
                expect(d$[observers]).toHaveLength(0);
                return;
            }
            throw new Error('expected promise to reject');
        });

        if (isSettable) {
            let settableValue$: SettableDerivable<string>;
            beforeEach(() => { settableValue$ = assertSettable(value$); });

            it('should resolve on the first reaction according to the lifecycle options', async () => {
                const promise = settableValue$.toPromise({ skipFirst: true });
                settableValue$.set('as promised');
                expect(await promise).toBe('as promised');
            });

            if (isAtom) {
                let atomValue$: DerivableAtom<string>;
                beforeEach(() => { atomValue$ = assertDerivableAtom(value$); });

                it('should resolve on the first resolved value', async () => {
                    atomValue$.unset();
                    atomValue$.set('some other value');
                    expect(await atomValue$.toPromise()).toBe('some other value');
                });

                it('should resolve on the first resolved value according to the lifecycle options', async () => {
                    atomValue$.unset();
                    const promise = atomValue$.toPromise({ skipFirst: true });
                    atomValue$.set('first real value');
                    atomValue$.set('second real value');
                    expect(await promise).toBe('second real value');
                });
            }
        }
    });

    describe('(final state)', () => {
        it('should detect final state when connected', () => {
            const a$ = factories.value('a');
            const b$ = factories.value('b');
            const d$ = derive(() => a$.get() + b$.get());
            expect(d$.final).toBeFalse();

            let stop = d$.react(() => 0);
            expect(d$.final).toBe(isConstant);
            stop();

            if (isDerivableAtom(a$) && isDerivableAtom(b$)) {
                a$.setFinal('a');
                expect(d$.final).toBeFalse();

                stop = d$.react(() => 0);
                expect(d$.final).toBeFalse();
                stop();

                b$.setFinal('b');
                expect(d$.final).toBeFalse();

                stop = d$.react(() => 0);
                expect(d$.final).toBeTrue();
                stop();

                // Should remain final. No way back.
                expect(d$.final).toBeTrue();
            }
        });

        isSettable && it('should throw when trying to set a new value', () => {
            // Make sure we are not final to begin with, otherwise some factories might create a derivable without a setter.
            const a$ = assertSettable(factories.value('first value'));
            a$.set(FinalWrapper.wrap('final value') as any);
            a$.autoCache().value;
            expect(() => a$.set('not possible')).toThrowError('cannot set a final derivable');
        });

        isAtom && it('should react to becoming final', () => {
            const reactor = jest.fn();
            const a$ = assertDerivableAtom(factories.value('a'));
            const b$ = assertDerivableAtom(factories.value('b'));
            const d$ = derive(() => a$.get() + b$.get());
            const stop = derive(() => d$.final).react(reactor, { skipFirst: true });

            a$.setFinal('a');
            expect(reactor).not.toHaveBeenCalled();

            b$.setFinal('b');
            expect(reactor).toHaveBeenCalledTimes(1);
            expect(reactor).toHaveBeenCalledWith(true, expect.toBeFunction());

            stop();
        });

        it('should allow starting as final', () => {
            const a$ = factories.value('a', true);
            if (a$ instanceof Derivation) {
                // Derivations need to be connected to detect final state.
                a$.autoCache();
            }
            expect(a$.final).toBeTrue();
            expect(a$.get()).toBe('a');
        });

        it('should automatically disconnect when starting as final', () => {
            const a$ = factories.value('a', true);
            const dummy$ = atom(0);
            const d$ = a$.derive(v => v + dummy$.value);
            d$.react(() => 0);
            expect(d$.connected).toBeTrue();
            expect(a$.connected).toBeFalse();
            expect(a$.final).toBeTrue();
        });

        isAtom && it('should disconnect when becoming final', () => {
            const a$ = assertDerivableAtom(factories.value('a'));
            const dummy$ = atom(0);
            const d$ = a$.derive(v => v + dummy$.value);
            d$.react(() => 0);
            expect(d$.connected).toBeTrue();
            expect(a$.connected).toBeTrue();
            a$.setFinal('a');
            expect(d$.connected).toBeTrue();
            expect(a$.connected).toBeFalse();
            expect(a$.final).toBeTrue();
        });
    });

    describe('(nested derivables)', () => {
        it('should just work', () => {
            const a$$ = atom(undefined as Derivable<number> | undefined);
            const a$ = a$$.derive(v => v && v.get());

            expect(a$.get()).toBeUndefined();

            const b$ = factories.value(5);

            a$$.set(b$);

            expect(a$.get()).toBe(5);

            let reactions = 0;
            let value: number | undefined;
            a$.react(v => { reactions++; value = v; }, { skipFirst: true });

            expect(reactions).toBe(0);

            if (isSettableDerivable(b$)) {
                b$.set(10);
                expect(reactions).toBe(1);
                expect(value).toBe(10);
                b$.set(4);
                expect(reactions).toBe(2);
                expect(value).toBe(4);
                reactions = 0;
            }

            const c$ = factories.value(9);
            a$$.set(c$);
            expect(reactions).toBe(1);
            expect(value).toBe(9);
        });
    });

    describe('(stability)', () => {
        const a$ = factories.value(fromJS({ a: 1 })).autoCache();

        if (isSettableDerivable(a$)) {
            it('should not return new instances when structurally the same', () => {
                const instance = a$.get();
                a$.set(fromJS({ a: 1 }));
                expect(a$.get()).toBe(instance);
                expect(a$.get() === instance).toBe(true);
            });
        }
    });

    describe('(in debug mode)', () => {
        beforeAll(() => { config.debugMode = true; });
        afterAll(() => { config.debugMode = false; });

        it('should generate a stacktrace on instantiation', () => {
            expect(factories.value(0).creationStack).toBeString();
        });

        noErrorAugmentation || it('should have augmented the error somewhere', () => {
            const d$ = factories.error(new Error('the Error'));
            expect(() => d$.get()).toThrowError('the Error');
            try {
                d$.get();
            } catch (e) {
                expect(isError(e) && e.stack).toContain(' created:\n');
            }
        });
    });
}

export function $<V>(d: SettableDerivable<V>): SettableDerivable<V> & BaseDerivable<V>;
export function $<V>(d: Derivable<V>): Derivable<V> & BaseDerivable<V>;
export function $(d: any) { return d; }
