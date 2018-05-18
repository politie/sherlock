import { expect } from 'chai';
import { atom, constant, DataSource, derivation } from '../derivable';
import { identityLens } from '../derivable/lens.spec';
import { isAtom, isConstant, isDerivable, isDerivation, isLens } from './types';

describe('extras/types', () => {
    class ReadonlyDataSource extends DataSource<void> {
        calculateCurrentValue() { /**/ }
    }
    class SettableDataSource extends DataSource<void> {
        calculateCurrentValue() { /**/ }
        acceptNewValue() { /**/ }
    }
    const testCases = [
        { value: atom(123), pAtom: true, pConstant: false, pDerivable: true, pDerivation: false, pLens: false },
        { value: constant(123), pAtom: false, pConstant: true, pDerivable: true, pDerivation: false, pLens: false },
        { value: derivation(() => 123), pAtom: false, pConstant: false, pDerivable: true, pDerivation: true, pLens: false },
        { value: atom(123).lens(identityLens<number>()), pAtom: true, pConstant: false, pDerivable: true, pDerivation: true, pLens: true },
        { value: new ReadonlyDataSource(), pAtom: false, pConstant: false, pDerivable: true, pDerivation: false, pLens: false },
        { value: new SettableDataSource(), pAtom: true, pConstant: false, pDerivable: true, pDerivation: false, pLens: false },
    ];

    for (const { value, pAtom, pConstant, pDerivable, pDerivation, pLens } of testCases) {
        it(`isAtom(${clsName(value)}) should return ${pAtom}`, () => {
            expect(isAtom(value)).to.equal(pAtom);
        });

        it(`isConstant(${clsName(value)}) should return ${pConstant}`, () => {
            expect(isConstant(value)).to.equal(pConstant);
        });

        it(`isDerivable(${clsName(value)}) should return ${pDerivable}`, () => {
            expect(isDerivable(value)).to.equal(pDerivable);
        });

        it(`isDerivation(${clsName(value)}) should return ${pDerivation}`, () => {
            expect(isDerivation(value)).to.equal(pDerivation);
        });

        it(`isLens(${clsName(value)}) should return ${pLens}`, () => {
            expect(isLens(value)).to.equal(pLens);
        });
    }
});

function clsName(obj: any) {
    return obj.constructor.name;
}
