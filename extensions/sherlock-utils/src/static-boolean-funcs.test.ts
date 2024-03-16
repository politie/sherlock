import { atom, constant, SettableDerivable } from '@politie/sherlock';
import { and, firstNotNull, or } from './static-boolean-funcs';

describe('sherlock-utils/static-boolean-funcs', () => {
    const testSet = sets([undefined, '', 'abc', 0, 3, false, true], 3);
    let atoms: Array<SettableDerivable<any>>;
    beforeEach(() => { atoms = [atom(0), atom(0), atom(0)]; });

    function updateAtoms(values: any[]) {
        values.forEach((v, i) => atoms[i].set(v));
    }

    describe('.and', () => {
        it('should return the first value which is falsey or the last value', () => {
            const and$ = and(...atoms);
            testSet.forEach(values => {
                updateAtoms(values);
                const expected = values.reduce((a, b) => a && b);
                expect(and$.get()).toBe(expected);
            });
        });

        it('should unwrap all arguments', () => {
            expect(and(1, constant(0), 3).get()).toBe(0);
            expect(and(1, constant(2), 3).get()).toBe(3);
        });
    });

    describe('.or', () => {
        it('should return the first value which is truthy or the last value', () => {
            const or$ = or(...atoms);
            testSet.forEach(values => {
                updateAtoms(values);
                const expected = values.reduce((a, b) => a || b);
                expect(or$.get()).toBe(expected);
            });
        });

        it('should unwrap all arguments', () => {
            expect(or(0, constant(0), 3).get()).toBe(3);
            expect(or(0, constant(2), 3).get()).toBe(2);
        });
    });

    describe('.firstNotNull', () => {
        it('should return the first value which is not null or undefined or the last value', () => {
            const firstNotNull$ = firstNotNull(...atoms);
            updateAtoms([undefined, undefined, undefined]);
            expect(firstNotNull$.get()).toBeUndefined();
            updateAtoms([undefined, undefined, 2]);
            expect(firstNotNull$.get()).toBe(2);
            updateAtoms([undefined, 0, 2]);
            expect(firstNotNull$.get()).toBe(0);
            updateAtoms([null, 0, 2]);
            expect(firstNotNull$.get()).toBe(0);
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
