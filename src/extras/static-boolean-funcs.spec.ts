import { expect } from 'chai';
import { Atom, atom, constant } from '../derivable';
import { and, firstNotNull, or } from './static-boolean-funcs';

describe('extras/static-boolean-funcs', () => {
    const testSet = sets([undefined, '', 'abc', 0, 3, false, true], 3);
    let atoms: Array<Atom<any>>;
    beforeEach('create the atoms', () => { atoms = [atom(0), atom(0), atom(0)]; });

    function updateAtoms(values: any[]) {
        values.forEach((v, i) => atoms[i].set(v));
    }

    describe('.and', () => {
        it('should return the first value which is falsey or the last value', () => {
            const and$ = and(...atoms);
            testSet.forEach(values => {
                updateAtoms(values);
                const expected = values.reduce((a, b) => a && b);
                expect(and$.get()).to.equal(expected);
            });
        });

        it('should unpack all arguments', () => {
            expect(and(1, constant(0), 3).get()).to.equal(0);
            expect(and(1, constant(2), 3).get()).to.equal(3);
        });
    });

    describe('.or', () => {
        it('should return the first value which is truthy or the last value', () => {
            const or$ = or(...atoms);
            testSet.forEach(values => {
                updateAtoms(values);
                const expected = values.reduce((a, b) => a || b);
                expect(or$.get()).to.equal(expected);
            });
        });

        it('should unpack all arguments', () => {
            expect(or(0, constant(0), 3).get()).to.equal(3);
            expect(or(0, constant(2), 3).get()).to.equal(2);
        });
    });

    describe('.firstNotNull', () => {
        it('should return the first value which is not null or undefined or the last value', () => {
            const firstNotNull$ = firstNotNull(...atoms);
            updateAtoms([undefined, undefined, undefined]);
            expect(firstNotNull$.get()).to.equal(undefined);
            updateAtoms([undefined, undefined, 2]);
            expect(firstNotNull$.get()).to.equal(2);
            updateAtoms([undefined, 0, 2]);
            expect(firstNotNull$.get()).to.equal(0);
            updateAtoms([null, 0, 2]);
            expect(firstNotNull$.get()).to.equal(0);
        });
    });
});

function sets(set: any[], length = 3): any[][] {
    let result: any[][] = [[]];
    while (length--) {
        result = ([] as any[][]).concat(...result.map(s => iterate(s, set)));
    }
    return result;
}

function iterate(base: any[], addition: any[]) {
    return addition.map(a => base.concat(a));
}
