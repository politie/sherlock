import { expect } from 'chai';
import { TargetedLensDescriptor } from '../interfaces';
import { Atom } from './atom';
import { $, testDerivable } from './base-derivable.spec';
import { atom, lens } from './factories';
import { testSwap } from './mixins/swap.spec';
import { unresolved } from './symbols';

describe('derivable/lens', () => {
    context('(mono)', () => {
        testDerivable(v => (new Atom(v === unresolved ? v : { value: v })).lens({
            get: obj => obj.value,
            set: value => ({ value }),
        }), false);
    });

    context('(mono with params)', () => {
        const propName = 'property';
        testDerivable(v => new Atom(v === unresolved ? v : { [propName]: v }).lens({
            get: (obj, prop) => obj[prop],
            set: (newValue, obj, prop) => ({ ...obj, [prop]: newValue }),
        }, propName), false);
    });

    context('(standalone)', () => {
        testDerivable(v => {
            const a$ = new Atom(v);
            const b$ = new Atom(v);
            return lens({
                get: () => {
                    const val = a$.get();
                    if (b$.get() !== val) { throw new Error(); }
                    return val;
                },
                set: x => {
                    a$.set(x);
                    b$.set(x);
                },
            });
        }, false);
    });

    context('(standalone with params)', () => {
        testDerivable(v => {
            const obj1$ = new Atom(v === unresolved ? v : { prop1: v });
            const obj2$ = new Atom(v === unresolved ? v : { prop2: v });
            return lens({
                get(prop1, prop2) {
                    const val = obj1$.get()[prop1];
                    if (obj2$.get()[prop2] !== val) { throw new Error(); }
                    return val;
                },
                set(newValue, prop1, prop2) {
                    obj1$.swap(obj => ({ ...obj, [prop1]: newValue }));
                    obj2$.swap(obj => ({ ...obj, [prop2]: newValue }));
                },
            }, 'prop1', 'prop2');
        }, false);
    });

    describe('#set', () => {
        it('should change the current state (and version) of the parent atom', () => {
            const a$ = $(atom('a'));
            const lensed$ = a$.lens(identityLens<string>());
            expect(lensed$.get()).to.equal('a');
            expect(a$.version).to.equal(0);

            lensed$.set('b');
            expect(lensed$.get()).to.equal('b');
            expect(a$.version).to.equal(1);
        });

        it('should not update the version if the new value equals the previous value', () => {
            const a$ = $(atom('a'));
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

export function identityLens<V>(): TargetedLensDescriptor<V, V, never> {
    return {
        get: v => v,
        set: v => v,
    };
}
