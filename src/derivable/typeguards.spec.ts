import { expect } from 'chai';
import { atom, constant, derive, PullDataSource } from '../derivable';
import { lens } from './factories';
import { isDerivable, isDerivableAtom, isSettableDerivable } from './typeguards';

describe('derivable/typeguards', () => {
    class ReadonlyDataSource extends PullDataSource<number> {
        calculateCurrentValue() { return 0; }
    }
    class SettableDataSource extends PullDataSource<number> {
        calculateCurrentValue() { return 0; }
        acceptNewValue() { /**/ }
    }
    const testCases = [
        { value: atom(123), settable: true, derivableAtom: true },
        { value: constant(123), settable: false, derivableAtom: false },
        { value: derive(() => 123), settable: false, derivableAtom: false },
        { value: atom(123).map(v => v), settable: false, derivableAtom: false },
        { value: atom(123).map(v => v, v => v), settable: true, derivableAtom: true },
        { value: lens({ get: () => 0, set: () => 0 }), settable: true, derivableAtom: false },
        { value: lens({ get: () => 0, set: () => 0 }).map(v => v), settable: false, derivableAtom: false },
        { value: lens({ get: () => 0, set: () => 0 }).map(v => v, v => v), settable: true, derivableAtom: false },
        { value: new ReadonlyDataSource(), settable: false, derivableAtom: false },
        { value: new SettableDataSource(), settable: true, derivableAtom: false },
    ];

    for (const { value, settable, derivableAtom } of testCases) {
        it(`isSettableDerivable(${clsName(value)}) should return ${settable}`, () => {
            expect(isSettableDerivable(value)).to.equal(settable);
        });

        it(`isDerivable(${clsName(value)}) should return true`, () => {
            expect(isDerivable(value)).to.be.true;
        });

        it(`isDerivableAtom(${clsName(value)}) should return ${derivableAtom}`, () => {
            expect(isDerivableAtom(value)).to.equal(derivableAtom);
        });
    }
});

function clsName(obj: any) {
    return obj.constructor.name;
}
