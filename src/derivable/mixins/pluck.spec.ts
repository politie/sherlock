import { expect } from 'chai';
import { fromJS, Seq } from 'immutable';
import { DerivableAtom, SettableDerivable } from 'interfaces';
import { Atom } from '../atom';
import { assertSettable, Factory } from '../base-derivable.spec';
import { atom, constant } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

/**
 * Tests the `pluck()` method.
 */
export function testPluck(factory: Factory, isSettable: boolean, isAtom: boolean) {
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

        it('should mirror the type of the input (being SettableDerivable or even DerivableAtom)', () => {
            const value$ = factory({ a: 1 });
            const plucked$ = value$.pluck('a');
            expect(isSettableDerivable(plucked$), 'isSettableDerivable(plucked$)').to.equal(isSettable);
            expect(isDerivableAtom(plucked$), 'isDerivableAtom(plucked$)').to.equal(isAtom);

            const dynPlucked$ = value$.pluck(constant('a'));
            expect(isSettableDerivable(dynPlucked$), 'isSettableDerivable(dynPlucked$)').to.equal(isSettable);
            // Not (yet) supported:
            expect(isDerivableAtom(dynPlucked$), 'isDerivableAtom(dynPlucked$)').to.be.false;
        });

        if (isSettable) {
            class MyClass { constructor(public key: string) { } }
            let value$: SettableDerivable<MyClass>;
            beforeEach('setup the base', () => { value$ = assertSettable(factory(new MyClass('value'))); });

            context('(lensed with constant key)', () => {
                let plucked$: SettableDerivable<string>;
                beforeEach('setup the derivation', () => { plucked$ = value$.pluck('key'); });

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
            });

            context('(lensed with derivable key)', () => {
                let key$: DerivableAtom<string>;
                let plucked$: SettableDerivable<string>;
                beforeEach('setup the key', () => { key$ = atom('key'); });
                beforeEach('setup the derivation', () => { plucked$ = value$.pluck(key$); });

                it('should produce a lens that can change any property based on the current value of the key', () => {
                    const oldInstance = value$.get();
                    expect(plucked$.get()).to.equal('value');
                    plucked$.set('another value');
                    expect(plucked$.get()).to.equal('another value');
                    expect(value$.get()).to.deep.equal({ key: 'another value' });
                    expect(value$.get()).to.not.equal(oldInstance);

                    key$.set('another');
                    expect(plucked$.get()).to.be.undefined;
                    plucked$.set('level');
                    expect(plucked$.get()).to.equal('level');
                    expect(value$.get()).to.deep.equal({ key: 'another value', another: 'level' });
                });
            });
        }
    });
}
