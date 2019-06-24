import { pairwise } from './pairwise';

describe('sherlock-utils/wrapPreviousState', () => {
    it('should return a monadic function, passing in the current and previous value to the provided dyadic function', () => {
        const f = pairwise((a, b) => a + b, 0);

        expect(f(1)).toBe(1);
        expect(f(2)).toBe(3);
        expect(f(3)).toBe(5);
        expect(f(4)).toBe(7);
        expect(f(5)).toBe(9);
        expect(f(6)).toBe(11);
    });

    it('should support leaving out the init value', () => {
        const f = pairwise((a: number, b?: number) => a + (b || 10));

        expect(f(1)).toBe(11);
        expect(f(2)).toBe(3);
    });
});
