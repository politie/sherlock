import { atom } from '@politie/sherlock';
import { template } from './template';

describe('sherlock-utils/template', () => {
    it('should convert a tagged string literal to a Derivable with unwrapped values', () => {
        const a$ = atom('a');
        const b$ = atom('a');
        const s$ = template`a$: ${a$}, b$: ${b$}`;
        expect(s$.get()).toBe('a$: a, b$: a');

        a$.set('aaa');
        b$.set('bbb');
        expect(s$.get()).toBe('a$: aaa, b$: bbb');
    });
});
