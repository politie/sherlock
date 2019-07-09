import { FinalWrapper } from '../utils';
import { Atom } from './atom';
import { testDerivable } from './base-derivable.tests';
import { lens } from './factories';
import { Lens } from './lens';

describe('derivable/lens', () => {
    describe('(standalone)', () => {
        testDerivable(a$ => {
            const b$ = new Atom(a$.getMaybeFinalState());
            return lens({
                get: () => {
                    const val = a$.get();
                    if (b$.get() !== val) {
                        throw new Error();
                    }
                    return val;
                },
                set: x => {
                    a$.set(x);
                    b$.set(x);
                },
            });
        }, 'settable');
    });

    describe('(standalone with params)', () => {
        testDerivable(a$ => {
            const obj1$ = new Atom(a$.map(prop1 => ({ prop1 })).getMaybeFinalState());
            const obj2$ = new Atom(a$.map(prop2 => ({ prop2 })).getMaybeFinalState());
            return lens({
                get(prop1, prop2) {
                    const val = obj1$.get()[prop1];
                    if (obj2$.get()[prop2] !== val) {
                        throw new Error();
                    }
                    return val;
                },
                set(newValue, prop1, prop2) {
                    obj1$.swap(obj => FinalWrapper.map(newValue, unwrapped => ({ ...obj, [prop1]: unwrapped })) as any);
                    obj2$.swap(obj => FinalWrapper.map(newValue, unwrapped => ({ ...obj, [prop2]: unwrapped })) as any);
                },
            }, 'prop1', 'prop2');
        }, 'settable');
    });

    it('should use the Lens object as `this`', () => {
        const lens$ = new Lens({
            get() { expect(this).toBe(lens$); return 1; },
            set() { expect(this).toBe(lens$); },
        });
        expect(lens$.get()).toBe(1);
        lens$.set(2);
    });
});
