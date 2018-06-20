import { expect } from 'chai';
import { fromJS } from 'immutable';
import { spy } from 'sinon';
import { Derivable, SettableDerivable } from '../interfaces';
import { BaseDerivable } from './base-derivable';
import { Derivation } from './derivation';
import { atom, constant, derive } from './factories';
import { isUnsettable, testAccessors } from './mixins/accessors.spec';
import { testBooleanFuncs } from './mixins/boolean-methods.spec';
import { testFallbackTo } from './mixins/fallback-to.spec';
import { testPluck } from './mixins/pluck.spec';
import { unresolved } from './symbols';
import { isSettableDerivable } from './typeguards';

export function testDerivable(factory: <V>(value: V | typeof unresolved) => Derivable<V>, immutable: boolean) {
    testAccessors(factory, immutable);
    testFallbackTo(factory);
    testBooleanFuncs(factory);
    testPluck(factory);

    describe('#derive', () => {
        const oneGigabyte = 1024 * 1024 * 1024;
        const bytes$ = factory(oneGigabyte);

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
        const value$ = factory('the value');
        it('should react immediately', () => {
            let receivedValue: string | undefined;
            let reactions = 0;
            value$.react(value => { receivedValue = value; reactions++; });
            expect(receivedValue).to.equal('the value');
            expect(reactions).to.equal(1);
        });

        if (isSettableDerivable(value$)) {
            beforeEach('reset the atom', () => resetAtomTo(value$, 'the value'));

            it('should react to change', () => {
                let receivedValue: string | undefined;
                let reactions = 0;
                value$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).to.equal('the value');
                expect(reactions).to.equal(1);
                value$.set('another value');
                expect(receivedValue).to.equal('another value');
                expect(reactions).to.equal(2);
            });

            it('should not react on no change', () => {
                const derived$ = value$.derive(() => 'constant');
                let receivedValue: string | undefined;
                let reactions = 0;
                derived$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);
                value$.set('b');
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);
            });

            it('should react on a derivation', () => {
                const base2$ = factory('other value');
                const derived$ = value$.derive((a, b) => `${a},${b}`, base2$);
                let receivedValue: string | undefined;
                let reactions = 0;
                derived$.react(value => { receivedValue = value; reactions++; });
                expect(receivedValue).to.equal('the value,other value');
                expect(reactions).to.equal(1);
                value$.set('123');
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
                const derived1$ = value$.derive(() => 'constant');
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

                value$.set('another value');

                expect(computation).to.have.been.calledOnce.and.to.have.been.calledWith('constant');
                expect(receivedValue).to.equal('constant');
                expect(reactions).to.equal(1);
            });
        }
    });

    describe('#toPromise', () => {
        const value$ = factory('the value');
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

        if (isSettableDerivable(value$)) {
            beforeEach('reset the atom', () => resetAtomTo(value$, 'the value'));

            it('should resolve on the first reaction according to the lifecycle options', async () => {
                const promise = value$.toPromise({ skipFirst: true });
                value$.set('as promised');
                expect(await promise).to.equal('as promised');
            });

            if (isUnsettable(value$)) {
                it('should resolve on the first resolved value', async () => {
                    value$.unset();
                    value$.set('some other value');
                    expect(await value$.toPromise()).to.equal('some other value');
                });

                it('should resolve on the first resolved value according to the lifecycle options', async () => {
                    value$.unset();
                    const promise = value$.toPromise({ skipFirst: true });
                    value$.set('first real value');
                    value$.set('second real value');
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
}

function resetAtomTo<V>(a$: SettableDerivable<V>, value: V) {
    $(a$).observers.forEach(obs => obs.disconnect());
    a$.set(value);
}

export function $<V>(d: SettableDerivable<V>): SettableDerivable<V> & BaseDerivable<V>;
export function $<V>(d: Derivable<V>): Derivable<V> & BaseDerivable<V>;
export function $(d: any) { return d; }
