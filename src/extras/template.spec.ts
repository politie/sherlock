import { expect } from 'chai';
import { atom } from '../derivable';
import { template } from './template';

describe('extras/template', () => {
    it('should convert a tagged string literal to a Derivable with unpacked values', () => {
        const a$ = atom('a');
        const b$ = atom('a');
        const s$ = template`a$: ${a$}, b$: ${b$}`;
        expect(s$.get()).to.equal('a$: a, b$: a');

        a$.set('aaa');
        b$.set('bbb');
        expect(s$.get()).to.equal('a$: aaa, b$: bbb');
    });
});
