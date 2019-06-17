import { scan } from './scan';

describe('sherlock-utils/scan', () => {
    it('should return a monadic function, passing in the current and previous value to the provided dyadic function', () => {
        const f = scan((a, v: number) => a + v, 0);

        expect(f(1)).toBe(1);
        expect(f(2)).toBe(3);
        expect(f(3)).toBe(6);
        expect(f(4)).toBe(10);
        expect(f(5)).toBe(15);
        expect(f(6)).toBe(21);
    });

    it('should support leaving out the init value', () => {
        const f = scan((a, v: string) => a + v);

        expect(f('!')).toBe('undefined!');
        expect(f('...')).toBe('undefined!...');
    });
});
