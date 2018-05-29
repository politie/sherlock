import { expect } from 'chai';
import { testDerivable } from './derivable.spec';
import { atom, lens } from './factories';
import { MonoLensDescriptor } from './lens.interface';
import { testSwap } from './mixins/swap.spec';

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

    testSwap(<V>(val: V) => atom(val).lens(identityLens<V>()));
});

export function identityLens<V>(): MonoLensDescriptor<V, V, never> {
    return {
        get: v => v,
        set: v => v,
    };
}
