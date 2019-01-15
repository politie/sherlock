import { expect } from 'chai';
import { Seq, Set as ISet } from 'immutable';
import { atom, unwrap } from '../derivable';
import { equals } from './equals';

describe('util/equals', () => {
    it('should check equality of primitives', () => {
        expect(equals(NaN, NaN)).to.be.true;
        expect(equals(4, 2 + 2)).to.be.true;
        expect(equals(0, 0)).to.be.true;
        expect(equals('abcd', 'ab' + 'cd')).to.be.true;
    });

    it('should check identity on ordinary object', () => {
        expect(equals({}, {})).to.be.false;
        expect(equals([], [])).to.be.false;
        const arr: never[] = [];
        const obj = {};
        expect(equals(arr, arr)).to.be.true;
        expect(equals(obj, obj)).to.be.true;
    });

    it('should check equality on immutable objects', () => {
        const seq = Seq.Indexed.of(1, 2, 3);
        const set = ISet.of(1, 2, 3);
        expect(equals(seq, set)).to.be.false;
        expect(equals(seq.toSetSeq(), set)).to.be.true;

        expect(equals(seq, [1, 2, 3])).to.be.false;
    });

    it('should check the equality of derivables', () => {
        const a = atom('foo');
        const b = atom('foo');
        const notA = atom('bar');

        const aDerivable = a.derive(v => v.toUpperCase());
        const bDerivable = b.derive(v => v.toUpperCase());

        const withObj1 = atom({ hello: 'world' });
        const withObj2 = atom({ hello: 'world' });

        expect(equals(a, a)).to.be.true;
        expect(equals(b, b)).to.be.true;

        expect(equals(a, notA)).to.be.false;
        expect(equals(a, b)).to.be.false;
        expect(equals(aDerivable, bDerivable)).to.be.false;

        expect(equals(withObj1, withObj1)).to.be.true;
        expect(equals(withObj1, withObj2)).to.be.false;
    });

    it('should test for reference equality, not derivable value equality', () => {
        const personA = { name$: atom('Sherlock') };
        const personB = { name$: atom('Sherlock') };
        const person$ = atom(personA);
        const nameOfPerson$ = person$.derive(p => p.name$).derive(unwrap).autoCache();

        expect(nameOfPerson$.get()).to.equal('Sherlock');
        person$.set(personB);
        expect(nameOfPerson$.get()).to.equal('Sherlock');
        personB.name$.set('Moriarty');
        expect(nameOfPerson$.get()).to.equal('Moriarty');
    });
});
