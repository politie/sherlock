import { atom } from '@politie/sherlock';
import { expect } from 'chai';
import { template } from './template';

describe('sherlock-utils/template', () => {
    it('should convert a tagged string literal to a Derivable with unwrapped values', () => {
        const a$ = atom('a');
        const b$ = atom('a');
        const s$ = template`a$: ${a$}, b$: ${b$}`;
        expect(s$.get()).to.equal('a$: a, b$: a');

        a$.set('aaa');
        b$.set('bbb');
        expect(s$.get()).to.equal('a$: aaa, b$: bbb');
    });
});
