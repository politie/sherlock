import { expect } from 'chai';
import { fromJS, List, Seq } from 'immutable';
import { spy } from 'sinon';
import { isAtom } from '../extras';
import { atom, Atom } from './atom';
import { constant } from './constant';
import { Derivable } from './derivable';
import { derivation, Derivation } from './derivation';
import { Lens } from './lens';

export function testDerivable(factory: <V>(value: V) => Derivable<V>) {
    describe('#get', () => {
        it('should return the current state', () => {
            const value$ = factory(123);
            expect(value$.get()).to.equal(123);

            if (isAtom(value$)) {
                value$.set(456);
                expect(value$.get()).to.equal(456);
            }
        });

        it(`should ${factory === constant ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = factory(123);
            expect(value$.observers).to.be.empty;
            const derived$ = value$.derive(value => value + 876);
            expect(value$.observers).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            derived$.observers.push({} as any);
            derived$.get();

            if (factory === constant) {
                expect(value$.observers).to.be.empty;
            } else {
                expect(value$.observers).to.have.length(1);
                expect(value$.observers[0]).to.equal(derived$);
            }
        });
    });

    describe('#value', () => {
        const a$ = factory('a');

        it('should call #get() when getting the #value property', () => {
            const s = spy(a$, 'get');

            // Use the getter
            expect(a$.value).to.equal('a');

            expect(s).to.have.been.calledOnce;
        });

        if (isAtom(a$)) {
            afterEach('reset a$', () => a$.set('a'));

            it('should call #set() when setting the #value property', () => {
                const s = spy(a$, 'set');

                a$.value = 'b';

                expect(s).to.have.been.calledOnce.and.calledWithExactly('b');
            });
        }
    });

    describe('#derive', () => {
        const oneGigabyte = 1024 * 1024 * 1024;
        const bytes$ = factory(oneGigabyte);

        // Created with derive method
        const kiloBytes$ = bytes$.derive(orderUp);

        // Created with derivation function
        const megaBytes$ = derivation(() => orderUp(kiloBytes$.get()));

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
            const sizeString$ = derivation(() => `${size$.get()} ${orderName$.get()}`);

            expect(sizeString$.get()).to.equal(oneGigabyte + ' bytes');
            order$.set(1);
            expect(sizeString$.get()).to.equal(1024 * 1024 + ' kilobytes');
            order$.set(2);
            expect(sizeString$.get()).to.equal('1024 megabytes');
            order$.set(3);
            expect(sizeString$.get()).to.equal('1 gigabytes');
        });

        it('should pass additional arguments unpacked to the deriver function', () => {
            function add(...ns: number[]) { return ns.reduce((a, b) => a + b, 0); }

            const potentialArgs = [1, 2, 3, 4, 5, 6];
            for (let argCount = 0; argCount < 6; argCount++) {
                const args = potentialArgs.slice(0, argCount);
                const dArgs = args.map(constant);
                const derivable = factory(0);
                expect(derivable.derive(add, ...args).get(), `with ${argCount} args`).to.equal(add(...args));
                expect(derivable.derive(add, ...dArgs).get(), `with ${argCount} args`).to.equal(add(...args));
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
            if (isAtom(value$)) {
                value$.set('another value');
                expect(received).to.deep.equal(['value', 'another value']);
            }
        });

        it('should be possible to derive from a cached derivable', () => {
            const value$ = factory('value').autoCache();
            const derived$ = value$.derive(v => v + '!');
            expect(derived$.get()).to.equal('value!');
            if (isAtom(value$)) {
                value$.set('another value');
                expect(derived$.get()).to.equal('another value!');
            }
        });
    });

    context('(boolean functions)', () => {
        const true$ = factory(true);
        const false$ = factory(false);
        const bool$ = atom(false);

        beforeEach('reset the atom', () => {
            bool$.set(false);
        });

        describe('#is', () => {
            it('should report equality on values', () => {
                const value$ = factory('value');
                expect(value$.is('value').get()).to.be.true;
                expect(value$.is('something else').get()).to.be.false;
            });

            it('should report equality on derivables', () => {
                const value$ = factory('value');
                const atom$ = atom('value');
                const valueIsAtom$ = value$.is(atom$);
                expect(valueIsAtom$.get()).to.be.true;
                atom$.set('something else');
                expect(valueIsAtom$.get()).to.be.false;
            });

            it('should use the utils.equals function', () => {
                const a$ = factory(List.of(1, 2, 3));
                const b$ = factory(Seq.of(1, 2, 3));
                expect(a$.is(b$).get()).to.be.true;
            });
        });

        describe('#or', () => {
            const trueOrBool$ = true$.or(bool$);
            const falseOrBool$ = false$.or(bool$);

            it('should apply boolean OR on the two derivables', () => {
                expect(trueOrBool$.get()).to.be.true;
                expect(falseOrBool$.get()).to.be.false;
                bool$.set(true);
                expect(trueOrBool$.get()).to.be.true;
                expect(falseOrBool$.get()).to.be.true;
            });

            it('should not observe the right operand when the left operand is truthy', () => {
                const s = spy(bool$, 'get');
                trueOrBool$.get();
                expect(s).not.to.have.been.called;
                falseOrBool$.get();
                expect(s).to.have.been.calledOnce;
                s.restore();
            });
        });

        describe('#and', () => {
            const trueAndBool$ = true$.and(bool$);
            const falseAndBool$ = false$.and(bool$);

            it('should apply boolean AND on the two derivables', () => {
                expect(trueAndBool$.get()).to.be.false;
                expect(falseAndBool$.get()).to.be.false;
                bool$.set(true);
                expect(trueAndBool$.get()).to.be.true;
                expect(falseAndBool$.get()).to.be.false;
            });

            it('should not observe the right operand when the left operand is falsey', () => {
                const s = spy(bool$, 'get');
                falseAndBool$.get();
                expect(s).not.to.have.been.called;
                trueAndBool$.get();
                expect(s).to.have.been.calledOnce;
                s.restore();
            });
        });

        describe('#not', () => {
            it('should apply boolean NOT on the input derivable', () => {
                expect(false$.not().get()).to.be.true;
                expect(true$.not().get()).to.be.false;
            });
        });

    });

    describe('#pluck', () => {
        it('should pluck using a string or derivable string', () => {
            const obj$ = factory({ a: 'valueOfA', b: 'valueOfB' });
            const a$ = obj$.pluck('a');
            expect(a$.get()).to.equal('valueOfA');

            const prop$ = atom('a');
            const item$ = obj$.pluck(prop$);
            expect(item$.get()).to.equal('valueOfA');
            prop$.set('b');
            expect(item$.get()).to.equal('valueOfB');
        });

        it('should pluck using a Derivable of string or number', () => {
            const arr$ = factory(['first', 'second']);
            const first$ = arr$.pluck(0);
            expect(first$.get()).to.equal('first');

            const prop$ = atom(0);
            const item$ = arr$.pluck(prop$);
            expect(item$.get()).to.equal('first');
            prop$.set(1);
            expect(item$.get()).to.equal('second');
        });

        it('should pluck immutable values', () => {
            const value$ = factory(fromJS({ a: ['value1', 'value2'] }));
            const a$ = value$.pluck('a');
            expect(a$.get()).to.equal(Seq.of('value1', 'value2'));
            const value1$ = a$.pluck(1);
            expect(value1$.get()).to.equal('value2');
        });

        context('(lensed)', () => {
            class MyClass { constructor(public key: string) { } }
            const value$ = factory(new MyClass('value'));

            if (isAtom(value$)) {
                beforeEach('reset the atom', () => value$.set(new MyClass('value')));

                const plucked$ = value$.pluck('key');

                it('should produce an Atom if the base was also an Atom', () => {
                    expect(plucked$).to.be.an.instanceof(Derivation);
                    expect(plucked$).to.be.an.instanceof(Lens);
                    expect(isAtom(plucked$)).to.be.true;
                });

                it('should produce a lens that can change a property (cloning the object)', () => {
                    const oldInstance = value$.get();
                    expect(plucked$.get()).to.equal('value');
                    plucked$.set('another value');
                    expect(plucked$.get()).to.equal('another value');
                    expect(value$.get()).to.deep.equal({ key: 'another value' });
                    expect(value$.get()).to.not.equal(oldInstance);
                });

                it('should produce a lens that can change a property on an instance of a class', () => {
                    expect(value$.get()).to.be.an.instanceOf(MyClass);
                    plucked$.set('other value');
                    expect(value$.get()).to.be.an.instanceOf(MyClass);
                });

                it('should produce a lens that can change immutable values', () => {
                    const immValue$ = factory(fromJS({ a: ['value1', 'value2'], b: ['value3', 'value4'] })) as Atom<any>;
                    const immPlucked$ = immValue$.pluck('b').pluck(0);
                    immPlucked$.set('replaced');
                    expect(immValue$.get()).to.equal(fromJS({ a: ['value1', 'value2'], b: ['replaced', 'value4'] }));
                });

                it('should not allow readonly immutable values to be changed', () => {
                    const immValue$ = factory(Seq.of(1, 2, 3)) as Atom<any>;
                    expect(() => immValue$.pluck(0).set(123)).to.throw();
                });
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

        if (isAtom(value$)) {
            beforeEach('reset the atom', () => { value$.observers.forEach(obs => obs.disconnect()); value$.set('the value'); });

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
                if (isAtom(base2$)) {
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

            if (isAtom(b$)) {
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
}
