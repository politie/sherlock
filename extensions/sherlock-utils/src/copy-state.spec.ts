import { atom, constant } from '@politie/sherlock';
import { expect } from 'chai';
import { copyState } from './copy-state';

describe('sherlock-utils/copyState', () => {
    it('should transfer value state', () => {
        const from$ = constant(123);
        const to$ = atom.unresolved();
        copyState(from$, to$);
        expect(to$.get()).to.equal(123);
    });

    it('should transfer unresolved state', () => {
        const from$ = constant.unresolved();
        const to$ = atom(123);
        copyState(from$, to$);
        expect(to$.resolved).to.be.false;
    });

    it('should transfer error state', () => {
        const from$ = constant.error('womp womp');
        const to$ = atom(123);
        copyState(from$, to$);
        expect(to$.error).to.equal('womp womp');
    });
});
