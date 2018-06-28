import { unresolved } from '../symbols';
import { ErrorWrapper } from '../utils';
import { Atom } from './atom';
import { testDerivable } from './base-derivable.spec';
import { atom, lens } from './factories';
import { testSwap } from './mixins/swap.spec';

describe('derivable/lens', () => {
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
            const obj1$ = new Atom(v === unresolved || v instanceof ErrorWrapper ? v : { prop1: v });
            const obj2$ = new Atom(v === unresolved || v instanceof ErrorWrapper ? v : { prop2: v });
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

    testSwap(<V>(val: V) => atom(val).map(v => v, v => v));
});
