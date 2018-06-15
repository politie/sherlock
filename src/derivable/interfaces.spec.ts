import { expect } from 'chai';
import { atom, constant, DataSource, derive } from '../derivable';
import { identityLens } from '../derivable/lens.spec';
import { isDerivable, isSettableDerivable } from './interfaces';

describe('extras/types', () => {
    class ReadonlyDataSource extends DataSource<void> {
        calculateCurrentValue() { /**/ }
    }
    class SettableDataSource extends DataSource<void> {
        calculateCurrentValue() { /**/ }
        acceptNewValue() { /**/ }
    }
    const testCases = [
        { value: atom(123), settable: true },
        { value: constant(123), settable: false },
        { value: derive(() => 123), settable: false },
        { value: atom(123).lens(identityLens<number>()), settable: true },
        { value: new ReadonlyDataSource(), settable: false },
        { value: new SettableDataSource(), settable: true },
    ];

    for (const { value, settable } of testCases) {
        it(`isAtom(${clsName(value)}) should return ${settable}`, () => {
            expect(isSettableDerivable(value)).to.equal(settable);
        });

        it(`isDerivable(${clsName(value)}) should return true`, () => {
            expect(isDerivable(value)).to.be.true;
        });
    }
});

function clsName(obj: any) {
    return obj.constructor.name;
}
