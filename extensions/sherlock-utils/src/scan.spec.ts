import { expect } from 'chai';
import { scan } from './scan';

describe('sherlock-utils/scan', () => {
    it('should return a monadic function, passing in the current and previous value to the provided dyadic function', () => {
        const f = scan((a, v: number) => a + v, 0);

        expect(f(1)).to.equal(1);
        expect(f(2)).to.equal(3);
        expect(f(3)).to.equal(6);
        expect(f(4)).to.equal(10);
        expect(f(5)).to.equal(15);
        expect(f(6)).to.equal(21);
    });

    it('should support leaving out the init value', () => {
        const f = scan((a, v: string) => a + v);

        expect(f('!')).to.equal('undefined!');
        expect(f('...')).to.equal('undefined!...');
    });
});
