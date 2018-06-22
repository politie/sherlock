import { expect } from 'chai';
import { List, Seq } from 'immutable';
import { spy } from 'sinon';
import { getState } from '../../symbols';
import { $, Factory } from '../base-derivable.spec';
import { atom } from '../factories';

/**
 * Tests the `is()`, `or()`, `and()` and `not()` methods.
 */
export function testBooleanFuncs(factory: Factory) {
    context('(boolean functions)', () => {
        const true$ = factory(true);
        const false$ = factory(false);
        const bool$ = atom(false);

        beforeEach('reset the atom', () => {
            bool$.set(false);
        });

        describe('#is', () => {
            it('should report equality on values', () => {
                const value$ = factory('value');
                expect(value$.is('value').get()).to.be.true;
                expect(value$.is('something else').get()).to.be.false;
            });

            it('should report equality on derivables', () => {
                const value$ = factory('value');
                const atom$ = atom('value');
                const valueIsAtom$ = value$.is(atom$);
                expect(valueIsAtom$.get()).to.be.true;
                atom$.set('something else');
                expect(valueIsAtom$.get()).to.be.false;
            });

            it('should use the utils.equals function', () => {
                const a$ = factory(List.of(1, 2, 3));
                const b$ = factory(Seq.of(1, 2, 3));
                expect(a$.is(b$).get()).to.be.true;
            });
        });

        describe('#or', () => {
            const trueOrBool$ = true$.or(bool$);
            const falseOrBool$ = false$.or(bool$);

            it('should apply boolean OR on the two derivables', () => {
                expect(trueOrBool$.get()).to.be.true;
                expect(falseOrBool$.get()).to.be.false;
                bool$.set(true);
                expect(trueOrBool$.get()).to.be.true;
                expect(falseOrBool$.get()).to.be.true;
            });

            it('should not observe the right operand when the left operand is truthy', () => {
                const s = spy($(bool$), getState);
                trueOrBool$.get();
                expect(s).not.to.have.been.called;
                falseOrBool$.get();
                expect(s).to.have.been.calledOnce;
                s.restore();
            });
        });

        describe('#and', () => {
            const trueAndBool$ = true$.and(bool$);
            const falseAndBool$ = false$.and(bool$);

            it('should apply boolean AND on the two derivables', () => {
                expect(trueAndBool$.get()).to.be.false;
                expect(falseAndBool$.get()).to.be.false;
                bool$.set(true);
                expect(trueAndBool$.get()).to.be.true;
                expect(falseAndBool$.get()).to.be.false;
            });

            it('should not observe the right operand when the left operand is falsey', () => {
                const s = spy($(bool$), getState);
                falseAndBool$.get();
                expect(s).not.to.have.been.called;
                trueAndBool$.get();
                expect(s).to.have.been.calledOnce;
                s.restore();
            });
        });

        describe('#not', () => {
            it('should apply boolean NOT on the input derivable', () => {
                expect(false$.not().get()).to.be.true;
                expect(true$.not().get()).to.be.false;
            });
        });

    });
}
