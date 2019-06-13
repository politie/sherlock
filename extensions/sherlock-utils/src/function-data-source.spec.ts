import { expect } from 'chai';
import { atom, isDerivable } from 'index';
import { spy } from 'sinon';
import { FunctionDataSource } from './function-data-source';

describe('sherlock-utils/functionDataSource', () => {
    let ds$: FunctionDataSource<{ key: string }>;
    beforeEach('create functiondatasource', () => {
        ds$ = new FunctionDataSource(() => ({ key: 'value' }));
        isDerivable(ds$);
        spy(ds$, 'calculateCurrentValue');
        spy(ds$, 'changed');
    });

    it('should calculate current value once', () => {
        expect(ds$.calculateCurrentValue).to.not.have.been.called;
        expect(ds$.pluck('key').value).to.equal('value');
        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
    });

    it('should calculate when derivable is not connected', () => {
        expect(ds$.calculateCurrentValue).to.not.have.been.called;
        ds$.get();
        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;

        ds$.changed();

        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
    });

    it('should calculate when derivable is connected', () => {
        const reactSpy = spy();
        expect(ds$.calculateCurrentValue).to.not.have.been.called;

        ds$.react(reactSpy); // connect the derivable
        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
        expect(reactSpy).to.have.been.calledOnce;

        ds$.changed();

        expect(ds$.calculateCurrentValue).to.have.been.calledTwice;
        expect(reactSpy).to.have.been.calledTwice;
    });

    it('should not calculate when nested derive changed', () => {
        const atom$ = atom('value');
        const reactAtomSpy = spy();
        expect(ds$.calculateCurrentValue).to.not.have.been.called;

        atom$.react(reactAtomSpy);
        ds$.get();
        ds$.derive(() => atom$);

        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
        expect(reactAtomSpy).to.have.been.calledOnce;

        ds$.changed();

        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
        expect(reactAtomSpy).to.have.been.calledOnce;

        atom$.set('another value');
        ds$.changed();

        expect(ds$.calculateCurrentValue).to.have.been.calledOnce;
        expect(reactAtomSpy).to.have.been.calledTwice;

    });
});
