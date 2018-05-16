import { expect } from 'chai';
import { spy } from 'sinon';
import { atom } from './atom';
import { testDerivable } from './derivable.spec';
import { lens, MonoLensDescriptor } from './lens';

describe('derivable/lens', () => {
    context('(mono)', () => {
        testDerivable(<V>(v: V) => atom({ value: v }).lens<V>({
            get: obj => obj.value,
            set: value => ({ value }),
        }));
    });

    context('(mono with params)', () => {
        const propName = 'property';
        testDerivable(<V>(v: V) => atom({ [propName]: v }).lens<V, string>({
            get: (obj, prop) => obj[prop],
            set: (newValue, obj, prop) => ({ ...obj, [prop]: newValue }),
        }, propName));
    });

    context('(standalone)', () => {
        testDerivable(<V>(v: V) => {
            const a$ = atom(v);
            const b$ = atom(v);
            return lens({
                get: () => {
                    const val: V = a$.get();
                    if (b$.get() !== val) { throw new Error(); }
                    return val;
                },
                set: x => {
                    a$.set(x);
                    b$.set(x);
                },
            });
        });
    });

    context('(standalone with params)', () => {
        testDerivable(<V>(v: V) => {
            const obj1$ = atom({ prop1: v });
            const obj2$ = atom({ prop2: v });
            return lens({
                get(prop1, prop2) {
                    const val: V = obj1$.get()[prop1];
                    if (obj2$.get()[prop2] !== val) { throw new Error(); }
                    return val;
                },
                set(newValue: V, prop1, prop2) {
                    obj1$.swap(obj => ({ ...obj, [prop1]: newValue }));
                    obj2$.swap(obj => ({ ...obj, [prop2]: newValue }));
                },
            }, 'prop1', 'prop2');
        });
    });

    describe('#set', () => {
        it('should change the current state (and version) of the parent atom', () => {
            const a$ = atom('a');
            const lensed$ = a$.lens(identityLens<string>());
            expect(lensed$.get()).to.equal('a');
            expect(a$.version).to.equal(0);

            lensed$.set('b');
            expect(lensed$.get()).to.equal('b');
            expect(a$.version).to.equal(1);
        });

        it('should not update the version if the new value equals the previous value', () => {
            const a$ = atom('a');
            const lensed$ = a$.lens(identityLens<string>());
            expect(lensed$.get()).to.equal('a');
            expect(a$.version).to.equal(0);
            lensed$.set('a');
            expect(lensed$.get()).to.equal('a');
            expect(a$.version).to.equal(0);
        });
    });

    describe('#value', () => {
        it('should call #get() when getting the #value property', () => {
            const a$ = atom('a');
            const lensed$ = a$.lens(identityLens<string>());
            const s = spy(lensed$, 'get');

            // Use the getter
            expect(lensed$.value).to.equal('a');

            expect(s).to.have.been.calledOnce;
        });

        it('should call #set() when setting the #value property', () => {
            const a$ = atom('a');
            const lensed$ = a$.lens(identityLens<string>());
            const s = spy(lensed$, 'set');

            lensed$.value = 'b';

            expect(s).to.have.been.calledOnce.and.calledWithExactly('b');
        });
    });

    describe('#swap', () => {
        it('should invoke the swap function with the current value and delegate the work to #set', () => {
            const a$ = atom('a');
            const lensed$ = a$.lens(identityLens<string>());
            spy(a$, 'get');
            spy(a$, 'set');

            lensed$.swap(a => a + '!');
            expect(a$.get).to.have.been.calledTwice;
            expect(a$.set).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly('a!');
            expect(lensed$.get()).to.equal('a!');
        });

        it('should pass any additional parameters to the swap function', () => {
            const a$ = atom('a');
            const lensed$ = a$.lens(identityLens<string>());
            function add(a: string, b: string) { return a + b; }
            lensed$.swap(add, '!');
            expect(lensed$.get()).to.equal('a!');
        });
    });
});

export function identityLens<V>(): MonoLensDescriptor<V, V, never> {
    return {
        get: v => v,
        set: v => v,
    };
}
