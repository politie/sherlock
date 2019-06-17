import { Seq, Set as ISet } from 'immutable';
import { atom, unwrap } from '../derivable';
import { equals } from './equals';

describe('util/equals', () => {
    it('should check equality of primitives', () => {
        expect(equals(NaN, NaN)).toBe(true);
        expect(equals(4, 2 + 2)).toBe(true);
        expect(equals(0, 0)).toBe(true);
        expect(equals('abcd', 'ab' + 'cd')).toBe(true);
    });

    it('should check identity on ordinary object', () => {
        expect(equals({}, {})).toBe(false);
        expect(equals([], [])).toBe(false);
        const arr: never[] = [];
        const obj = {};
        expect(equals(arr, arr)).toBe(true);
        expect(equals(obj, obj)).toBe(true);
    });

    it('should check equality on immutable objects', () => {
        const seq = Seq.Indexed.of(1, 2, 3);
        const set = ISet.of(1, 2, 3);
        expect(equals(seq, set)).toBe(false);
        expect(equals(seq.toSetSeq(), set)).toBe(true);

        expect(equals(seq, [1, 2, 3])).toBe(false);
    });

    it('should check the equality of derivables', () => {
        const a = atom('foo');
        const b = atom('foo');
        const notA = atom('bar');

        const aDerivable = a.derive(v => v.toUpperCase());
        const bDerivable = b.derive(v => v.toUpperCase());

        const withObj1 = atom({ hello: 'world' });
        const withObj2 = atom({ hello: 'world' });

        expect(equals(a, a)).toBe(true);
        expect(equals(b, b)).toBe(true);

        expect(equals(a, notA)).toBe(false);
        expect(equals(a, b)).toBe(false);
        expect(equals(aDerivable, bDerivable)).toBe(false);

        expect(equals(withObj1, withObj1)).toBe(true);
        expect(equals(withObj1, withObj2)).toBe(false);
    });

    it('should test for reference equality, not derivable value equality', () => {
        const personA = { name$: atom('Sherlock') };
        const personB = { name$: atom('Sherlock') };
        const person$ = atom(personA);
        const nameOfPerson$ = person$.derive(p => p.name$).derive(unwrap).autoCache();

        expect(nameOfPerson$.get()).toBe('Sherlock');
        person$.set(personB);
        expect(nameOfPerson$.get()).toBe('Sherlock');
        personB.name$.set('Moriarty');
        expect(nameOfPerson$.get()).toBe('Moriarty');
    });
});
