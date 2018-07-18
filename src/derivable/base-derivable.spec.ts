import { expect } from 'chai';
import { fromJS } from 'immutable';
import { spy } from 'sinon';
import { Derivable, DerivableAtom, SettableDerivable, State } from '../interfaces';
import { dependencies, observers, unresolved } from '../symbols';
import { config, ErrorWrapper } from '../utils';
import { BaseDerivable } from './base-derivable';
import { Derivation } from './derivation';
import { atom, constant, derive } from './factories';
import { Mapping } from './map';
import { testAccessors } from './mixins/accessors.spec';
import { testBooleanFuncs } from './mixins/boolean-methods.spec';
import { testFallbackTo } from './mixins/fallback-to.spec';
import { testPluck } from './mixins/pluck.spec';
import { testDerivableAtomSetters } from './mixins/setters.spec';
import { testSwap } from './mixins/swap.spec';
import { isDerivableAtom, isSettableDerivable } from './typeguards';

export type Factory = <V>(state: State<V>) => Derivable<V>;

export type DerivableMode = 'constant' | 'no-error-augmentation' | 'settable' | 'atom';

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

export function testDerivable(factory: Factory, ...modes: DerivableMode[]) {
    const isAtom = modes.includes('atom');
    const isConstant = modes.includes('constant');
    const isSettable = modes.includes('settable');
    const noErrorAugmentation = modes.includes('no-error-augmentation');

    testAccessors(factory, isConstant);
    testFallbackTo(factory);
    testBooleanFuncs(factory);
    testPluck(factory, isSettable, isAtom);

    if (isSettable) {
        testSwap(factory);
    } else {
        it('should not be settable', () => {
            expect(isSettableDerivable(factory(0))).to.be.false;
        });
    }

    if (isAtom) {
        testDerivableAtomSetters(factory);
    } else {
        it('should not be a derivable atom', () => {
            expect(isDerivableAtom(factory(0))).to.be.false;
        });
    }

    const oneGigabyte = 1024 * 1024 * 1024;
    const bytes$ = factory(oneGigabyte);
    describe('#derive', () => {

        // Created with derive method
        const kiloBytes$ = bytes$.derive(orderUp);

        // Created with derive function
        const megaBytes$ = derive(() => orderUp(kiloBytes$.get()));

        function orderUp(n: number, order = 1): number {
            return order > 0 ? orderUp(n / 1024, order - 1) : n;
        }

        it('should create a derivation', () => {
            expect(kiloBytes$).to.be.an.instanceOf(Derivation);
            expect(megaBytes$).to.be.an.instanceOf(Derivation);
            expect(kiloBytes$.get()).to.equal(1024 * 1024);
            expect(megaBytes$.get()).to.equal(1024);
        });

        it('should be able to derive from more than one derivables', () => {
            const order$ = atom(0);
            const orderName$ = order$.derive(order => ['bytes', 'kilobytes', 'megabytes', 'gigabytes'][order]);
            const size$ = bytes$.derive(orderUp, order$);
            const sizeString$ = derive(() => `${size$.get()} ${orderName$.get()}`);

            expect(sizeString$.get()).to.equal(oneGigabyte + ' bytes');
            order$.set(1);
            expect(sizeString$.get()).to.equal(1024 * 1024 + ' kilobytes');
            order$.set(2);
            expect(sizeString$.get()).to.equal('1024 megabytes');
            order$.set(3);
            expect(sizeString$.get()).to.equal('1 gigabytes');
        });

        it('should pass additional arguments unwrapped to the deriver function', () => {
            function add(...ns: number[]) { return ns.reduce((a, b) => a + b, 0); }

            const potentialArgs = [1, 2, 3, 4, 5, 6];
            for (let argCount = 0; argCount < 6; argCount++) {
                const args = potentialArgs.slice(0, argCount);
                const dArgs = args.map(v => constant(v));
                const derivable = factory(0);
                expect(derivable.derive(add, ...args).get(), `with ${argCount} args`).to.equal(add(...args));
                expect(derivable.derive(add, ...dArgs).get(), `with ${argCount} args`).to.equal(add(...args));
            }
        });

        it('should propagate unresolved status of any input derivable', () => {
            const value$ = factory<string>(unresolved);
            const otherValue$ = atom('2');
            const yetAnotherValue$ = atom('3');
            const d$ = value$.derive((v, otherValue) => v + otherValue + yetAnotherValue$.get(), otherValue$);

            expect(d$.resolved).to.be.false;

            if (isSettableDerivable(value$)) {
                expect(d$.value).to.be.undefined;
                value$.set('1');
                expect(d$.value).to.equal('123');
                otherValue$.unset();
                expect(d$.value).to.be.undefined;
                otherValue$.set('4');
                expect(d$.value).to.equal('143');
                yetAnotherValue$.unset();
                expect(d$.value).to.be.undefined;
                yetAnotherValue$.set('5');
                expect(d$.value).to.equal('145');
            }
        });
    });

    describe('#map', () => {
        // Created with map method
        const kiloBytes$ = bytes$.map(n => n / 1024);

        it('should create a derivation', () => {
            expect(kiloBytes$).to.be.an.instanceOf(Mapping);
            expect(kiloBytes$.get()).to.equal(1024 * 1024);
        });

        it('should propagate unresolved status of input derivable', () => {
            const value$ = factory<string>(unresolved);
            const d$ = value$.map(v => v + '!');

            expect(d$.resolved).to.be.false;

            if (isSettableDerivable(value$)) {
                expect(d$.value).to.be.undefined;
                value$.set('1');
                expect(d$.value).to.equal('1!');
                if (isDerivableAtom(value$)) {
                    value$.unset();
                    expect(d$.value).to.be.undefined;
                }
            }
        });
    });

    describe('#autoCache', () => {
        it('should return the derivable', () => {
            const value$ = factory('value');
            expect(value$.autoCache()).to.equal(value$);
        });

        it('should be possible to start a reactor on a cached Derivable', () => {
            const value$ = factory('value').autoCache();
            const received: string[] = [];
            value$.react(received.push.bind(received));
            expect(received).to.deep.equal(['value']);
            if (isSettableDerivable(value$)) {
                value$.set('another value');
                expect(received).to.deep.equal(['value', 'another value']);
            }
        });

        it('should be possible to derive from a cached derivable', () => {
            const value$ = factory('value').autoCache();
            const derived$ = value$.derive(v => v + '!');
            expect(derived$.get()).to.equal('value!');
            if (isSettableDerivable(value$)) {
                value$.set('another value');
                expect(derived$.get()).to.equal('another value!');
            }
        });
    });

    describe('#react', () => {
        let value$: Derivable<string>;
        beforeEach(() => { value$ = factory('the value'); });

        it('should react immediately', () => {
            let receivedValue: string | undefined;
            let reactions = 0;
            value$.react(value => { receivedValue = value; reactions++; });
            expect(receivedValue).to.equal('the value');
            expect(reactions).to.equal(1);
        });

        if (isSettable) {
            let settableValue$: SettableDerivable<string>;
            beforeEach(() => { settableValue$ = assertSettable(value$); });

            it('should react to change', () => {
                let receivedValue: string | undefined;
                let reactions = 0;
                settableValue$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).to.equal('the value');
                expect(reactions).to.equal(1);
                settableValue$.set('another value');
                expect(receivedValue).to.equal('another value');
                expect(reactions).to.equal(2);
            });

            it('should not react on no change', () => {
                const derived$ = settableValue$.derive(() => 'constant');
                let receivedValue: string | undefined;
                let reactions = 0;
                derived$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);
                settableValue$.set('b');
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);
            });

            it('should react on a derivation', () => {
                const base2$ = factory('other value');
                const derived$ = settableValue$.derive((a, b) => `${a},${b}`, base2$);
                let receivedValue: string | undefined;
                let reactions = 0;
                derived$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).to.equal('the value,other value');
                expect(reactions).to.equal(1);
                settableValue$.set('123');
                expect(receivedValue).to.equal('123,other value');
                expect(reactions).to.equal(2);
                if (isSettableDerivable(base2$)) {
                    base2$.set('456');
                    expect(receivedValue).to.equal('123,456');
                    expect(reactions).to.equal(3);
                }
            });

            it('should not recompute when no dependency changed', () => {
                // First derived value will have to recompute, because it doesn't know it always returns the same value
                const derived1$ = settableValue$.derive(() => 'constant');
                const computation = spy((v: any) => v);
                // Second derived value should never recompute, because the input never changes.
                const derived2$ = derived1$.derive(computation);

                expect(computation).to.not.have.been.called;

                let receivedValue: string | undefined;
                let reactions = 0;
                derived2$.react(value => { receivedValue = value; reactions++; });

                expect(computation).to.have.been.calledOnce.and.to.have.been.calledWith('constant');
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);

                settableValue$.set('another value');

                expect(computation).to.have.been.calledOnce.and.to.have.been.calledWith('constant');
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);
            });
        }
    });

    describe('#connected$', () => {
        it('should keep observers updated on connected state', () => {
            const d$ = factory('a certain value');
            let connected = false;
            d$.connected$.react(v => connected = v);

            expect(connected).to.be.false;

            const stop = derive(() => d$.get()).react(() => 0);
            expect(connected).to.equal(!isConstant);

            stop();

            expect(connected).to.be.false;
        });

        it('should not polute any observer administration', () => {
            // Because connection happens during derivations we have to be very careful, side-effects
            // during derivations can result in memory-leaks because of the way our dependency tracking works.
            const base$ = factory('value');
            const derived$ = base$.derive(v => v);
            const connected$ = base$.connected$;
            connected$.react(() => 0);
            derived$.react(() => 0);

            // If we don't isolate our side-effects from dependency tracking, derived$ would think it depended on the
            // connected$ atom, which is not true and prevents disconnect from ever being called.
            expect(derived$[dependencies]).to.have.length(isConstant ? 0 : 1);
        });
    });

    describe('#toPromise', () => {
        let value$: Derivable<string>;
        beforeEach(() => { value$ = factory('the value'); });

        it('should resolve immediately when no options are given', async () => {
            expect(await value$.toPromise()).to.equal('the value');
        });

        it('should reject on errors in any upstream derivation', async () => {
            const d$ = value$.derive(() => { throw new Error('with a message'); });

            try {
                await d$.toPromise();
            } catch (e) {
                expect(e).to.be.an('error');
                expect(e.message).to.equal('with a message');
                return;
            }
            throw new Error('expected promise to reject');
        });

        it('should stop the reactor on an error upstream', async () => {
            const d$ = value$.derive(() => { throw new Error('with a message'); });

            try {
                await d$.toPromise();
            } catch (e) {
                expect(d$[observers]).to.be.empty;
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
                expect(await promise).to.equal('as promised');
            });

            if (isAtom) {
                let atomValue$: DerivableAtom<string>;
                beforeEach(() => { atomValue$ = assertDerivableAtom(value$); });

                it('should resolve on the first resolved value', async () => {
                    atomValue$.unset();
                    atomValue$.set('some other value');
                    expect(await atomValue$.toPromise()).to.equal('some other value');
                });

                it('should resolve on the first resolved value according to the lifecycle options', async () => {
                    atomValue$.unset();
                    const promise = atomValue$.toPromise({ skipFirst: true });
                    atomValue$.set('first real value');
                    atomValue$.set('second real value');
                    expect(await promise).to.equal('second real value');
                });
            }
        }
    });

    context('(nested derivables)', () => {
        it('should just work', () => {
            const a$$ = atom(undefined as Derivable<number> | undefined);
            const a$ = a$$.derive(v => v && v.get());

            expect(a$.get()).to.be.undefined;

            const b$ = factory(5);

            a$$.set(b$);

            expect(a$.get()).to.equal(5);

            let reactions = 0;
            let value: number | undefined;
            a$.react(v => { reactions++; value = v; }, { skipFirst: true });

            expect(reactions).to.equal(0);

            if (isSettableDerivable(b$)) {
                b$.set(10);
                expect(reactions).to.equal(1);
                expect(value).to.equal(10);
                b$.set(4);
                expect(reactions).to.equal(2);
                expect(value).to.equal(4);
                reactions = 0;
            }

            const c$ = factory(9);
            a$$.set(c$);
            expect(reactions).to.equal(1);
            expect(value).to.equal(9);
        });
    });

    context('(stability)', () => {
        const a$ = factory(fromJS({ a: 1 })).autoCache();

        if (isSettableDerivable(a$)) {
            it('should not return new instances when structurally the same', () => {
                const instance = a$.get();
                a$.set(fromJS({ a: 1 }));
                expect(a$.get()).to.equal(instance);
                expect(a$.get() === instance).to.equal(true, 'encountered another instance with the same data');
            });
        }
    });

    context('(in debug mode)', () => {
        before('setDebugMode', () => { config.debugMode = true; });
        after('resetDebugMode', () => { config.debugMode = false; });

        it('should generate a stacktrace on instantiation', () => {
            expect(factory(0).creationStack).to.be.a('string');
        });

        noErrorAugmentation || it('should have augmented the error somewhere', () => {
            const d$ = factory(new ErrorWrapper(new Error('the Error')));
            expect(() => d$.get()).to.throw('the Error');
            try {
                d$.get();
            } catch (e) {
                expect(e.stack).to.contain(' created:\n');
            }
        });
    });
}

export function $<V>(d: SettableDerivable<V>): SettableDerivable<V> & BaseDerivable<V>;
export function $<V>(d: Derivable<V>): Derivable<V> & BaseDerivable<V>;
export function $(d: any) { return d; }
