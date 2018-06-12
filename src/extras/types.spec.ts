import { expect } from 'chai';
import { atom, constant, DataSource, derive } from '../derivable';
import { identityLens } from '../derivable/lens.spec';
import { isDerivable, isSettableDerivable } from './types';

describe('extras/types', () => {
    class ReadonlyDataSource extends DataSource<void> {
        calculateCurrentValue() { /**/ }
    }
    class SettableDataSource extends DataSource<void> {
        calculateCurrentValue() { /**/ }
        acceptNewValue() { /**/ }
    }
    const testCases = [
        { value: atom(123), pSettableDerivable: true, pDerivable: true },
        { value: constant(123), pSettableDerivable: false, pDerivable: true },
        { value: derive(() => 123), pSettableDerivable: false, pDerivable: true },
        { value: atom(123).lens(identityLens<number>()), pSettableDerivable: true, pDerivable: true },
        { value: new ReadonlyDataSource(), pSettableDerivable: false, pDerivable: true },
        { value: new SettableDataSource(), pSettableDerivable: true, pDerivable: true },
    ];

    for (const { value, pSettableDerivable, pDerivable } of testCases) {
        it(`isAtom(${clsName(value)}) should return ${pSettableDerivable}`, () => {
            expect(isSettableDerivable(value)).to.equal(pSettableDerivable);
        });

        it(`isDerivable(${clsName(value)}) should return ${pDerivable}`, () => {
            expect(isDerivable(value)).to.equal(pDerivable);
        });
    }
});

function clsName(obj: any) {
    return obj.constructor.name;
}
