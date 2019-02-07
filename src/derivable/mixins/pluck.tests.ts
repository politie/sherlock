import { fromJS, Seq } from 'immutable';
import { DerivableAtom, SettableDerivable } from 'interfaces';
import { Atom } from '../atom';
import { assertSettable, Factory } from '../base-derivable.tests';
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
            expect(a$.get()).toBe('valueOfA');

            const prop$ = atom('a');
            const item$ = obj$.pluck(prop$);
            expect(item$.get()).toBe('valueOfA');
            prop$.set('b');
            expect(item$.get()).toBe('valueOfB');
        });

        it('should pluck using a Derivable of string or number', () => {
            const arr$ = factory(['first', 'second']);
            const first$ = arr$.pluck(0);
            expect(first$.get()).toBe('first');

            const prop$ = atom(0);
            const item$ = arr$.pluck(prop$);
            expect(item$.get()).toBe('first');
            prop$.set(1);
            expect(item$.get()).toBe('second');
        });

        it('should pluck immutable values', () => {
            const value$ = factory(fromJS({ a: ['value1', 'value2'] }));
            const a$ = value$.pluck('a');
            expect(Seq.Indexed.of('value1', 'value2').equals(a$.get())).toBeTrue();
            const value1$ = a$.pluck(1);
            expect(value1$.get()).toBe('value2');
        });

        it('should mirror the type of the input (being SettableDerivable or even DerivableAtom)', () => {
            const value$ = factory({ a: 1 });
            const plucked$ = value$.pluck('a');
            expect(isSettableDerivable(plucked$)).toBe(isSettable);
            expect(isDerivableAtom(plucked$)).toBe(isAtom);

            const dynPlucked$ = value$.pluck(constant('a'));
            expect(isSettableDerivable(dynPlucked$)).toBe(isSettable);
            // Not (yet) supported:
            expect(isDerivableAtom(dynPlucked$)).toBe(false);
        });

        if (isSettable) {
            class MyClass { constructor(public key: string) { } }
            let value$: SettableDerivable<MyClass>;
            beforeEach(() => { value$ = assertSettable(factory(new MyClass('value'))); });

            describe('(lensed with constant key)', () => {
                let plucked$: SettableDerivable<string>;
                beforeEach(() => { plucked$ = value$.pluck('key'); });

                it('should produce a lens that can change a property (cloning the object)', () => {
                    const oldInstance = value$.get();
                    expect(plucked$.get()).toBe('value');
                    plucked$.set('another value');
                    expect(plucked$.get()).toBe('another value');
                    expect(value$.get()).toEqual({ key: 'another value' });
                    expect(value$.get()).not.toBe(oldInstance);
                });

                it('should produce a lens that can change a property on an instance of a class', () => {
                    expect(value$.get()).toBeInstanceOf(MyClass);
                    plucked$.set('other value');
                    expect(value$.get()).toBeInstanceOf(MyClass);
                }
                );

                it('should produce a lens that can change immutable values', () => {
                    const immValue$ = factory(fromJS({ a: ['value1', 'value2'], b: ['value3', 'value4'] })) as Atom<any>;
                    const immPlucked$ = immValue$.pluck('b').pluck(0);
                    immPlucked$.set('replaced');
                    expect(fromJS({ a: ['value1', 'value2'], b: ['replaced', 'value4'] }).equals(immValue$.get())).toBeTrue();
                });

                it('should not allow readonly immutable values to be changed', () => {
                    const immValue$ = factory(Seq.Indexed.of(1, 2, 3)) as Atom<any>;
                    expect(() => immValue$.pluck(0).set(123)).toThrowError();
                });
            });

            describe('(lensed with derivable key)', () => {
                let key$: DerivableAtom<string>;
                let plucked$: SettableDerivable<string>;
                beforeEach(() => { key$ = atom('key'); });
                beforeEach(() => { plucked$ = value$.pluck(key$); });

                it('should produce a lens that can change any property based on the current value of the key', () => {
                    const oldInstance = value$.get();
                    expect(plucked$.get()).toBe('value');
                    plucked$.set('another value');
                    expect(plucked$.get()).toBe('another value');
                    expect(value$.get()).toEqual({ key: 'another value' });
                    expect(value$.get()).not.toBe(oldInstance);

                    key$.set('another');
                    expect(plucked$.get()).toBeUndefined();
                    plucked$.set('level');
                    expect(plucked$.get()).toBe('level');
                    expect(value$.get()).toEqual({ key: 'another value', another: 'level' });
                });
            });
        }
    });
}
