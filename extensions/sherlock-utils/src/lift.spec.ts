import { constant } from '@politie/sherlock';
import { expect } from 'chai';
import { lift } from './lift';

describe('sherlock-utils/lift', () => {
    const niladic = () => 'niladic';
    const monadic = (s: string) => `monadic (${s})`;
    const dyadic = (s: string, n: number) => `dyadic (${s},${n})`;
    const triadic = (p1: string, p2: number, p3: string) => `triadic (${p1},${p2},${p3})`;

    it('should always return a derivable', () => {
        const f = lift(niladic);
        expect(f().get()).to.equal('niladic');
    });

    it('should unwrap parameters before handing them over to the provided function', () => {
        const a$ = constant('a');
        const b$ = constant('b');
        const n$ = constant(123);

        const f = lift(monadic);
        expect(f(a$).get()).to.equal('monadic (a)');
        expect(f('a').get()).to.equal('monadic (a)');

        const g = lift(dyadic);
        expect(g(a$, n$).get()).to.equal('dyadic (a,123)');
        expect(g('a', n$).get()).to.equal('dyadic (a,123)');

        const h = lift(triadic);
        expect(h(a$, n$, b$).get()).to.equal('triadic (a,123,b)');
        expect(h('a', n$, b$).get()).to.equal('triadic (a,123,b)');
    });
});
