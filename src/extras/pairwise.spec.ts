import { expect } from 'chai';
import { pairwise } from './pairwise';

describe('extras/wrapPreviousState', () => {
    it('should return a monadic function, passing in the current and previous value to the provided dyadic function', () => {
        const f = pairwise((a, b) => a + b, 0);

        expect(f(1)).to.equal(1);
        expect(f(2)).to.equal(3);
        expect(f(3)).to.equal(5);
        expect(f(4)).to.equal(7);
        expect(f(5)).to.equal(9);
        expect(f(6)).to.equal(11);
    });

    it('should support leaving out the init value', () => {
        const f = pairwise((a: number, b?: number) => a + (b || 10));

        expect(f(1)).to.equal(11);
        expect(f(2)).to.equal(3);
    });
});
