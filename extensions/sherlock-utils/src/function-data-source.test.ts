import { atom, isDerivable } from '@politie/sherlock';
import { FunctionDataSource } from './function-data-source';

describe('sherlock-utils/function-data-source', () => {
    describe('calculate', () => {
        let ds$: FunctionDataSource<{key: string}>;

        beforeEach(() => {
            ds$ = new FunctionDataSource(() => ({ key: 'value' }));
            isDerivable(ds$);

            jest.spyOn(ds$, 'calculateCurrentValue');
            jest.spyOn(ds$, 'changed');
        });

        it('should calculate current value once', () => {
            expect(ds$.calculateCurrentValue).not.toHaveBeenCalled();
            expect(ds$.pluck('key').value).toEqual('value');
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
        });

        it('should calculate when derivable is not connected', () => {
            expect(ds$.calculateCurrentValue).not.toHaveBeenCalled();

            ds$.get();
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);

            ds$.changed();

            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
        });

        it('should calculate when derivable is connected', () => {
            const reactSpy = jest.fn();
            expect(ds$.calculateCurrentValue).not.toHaveBeenCalled();

            ds$.react(reactSpy);
            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(reactSpy).toHaveBeenCalledTimes(1);

            ds$.changed();

            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(2);
            expect(reactSpy).toHaveBeenCalledTimes(2);
        });

        it('should not calculate when nested derive changed', () => {
            const atom$ = atom('value');
            const reactAtomSpy = jest.fn();
            expect(ds$.calculateCurrentValue).not.toHaveBeenCalled();

            atom$.react(reactAtomSpy);
            ds$.get();
            ds$.derive(() => atom$);

            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(reactAtomSpy).toHaveBeenCalledTimes(1);

            ds$.changed();

            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(reactAtomSpy).toHaveBeenCalledTimes(1);

            atom$.set('another value');
            ds$.changed();

            expect(ds$.calculateCurrentValue).toHaveBeenCalledTimes(1);
            expect(reactAtomSpy).toHaveBeenCalledTimes(2)
        });
    });
});
