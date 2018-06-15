import { expect } from 'chai';
import { spy } from 'sinon';
import { isSettableDerivable } from '../../extras';
import { addObserver } from '../../tracking';
import { $ } from '../base-derivable.spec';
import { Constant } from '../constant';
import { Derivable } from '../interfaces';

/**
 * Tests the `get()` method and `value` accessors.
 */
export function testAccessors(factory: <V>(value: V) => Derivable<V>, immutable: boolean) {
    describe('#get', () => {
        it('should return the current state', () => {
            const value$ = factory(123);
            expect(value$.get()).to.equal(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.get()).to.equal(456);
            }
        });

        it(`should ${immutable ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$.observers).to.be.empty;
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$.observers).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.get();

            if (immutable) {
                expect(value$.observers).to.be.empty;
            } else {
                expect(value$.observers).to.have.length(1);
                expect(value$.observers[0]).to.equal(derived$);
            }
        });
    });

    describe('#value', () => {
        const a$ = factory('a');

        if (!(a$ instanceof Constant)) {
            it('should call #get() when getting the #value property', () => {
                const s = spy(a$, 'get');

                // Use the getter
                expect(a$.value).to.equal('a');

                expect(s).to.have.been.calledOnce;
            });
        }

        if (isSettableDerivable(a$)) {
            beforeEach('reset a$', () => a$.set('a'));

            it('should call #set() when setting the #value property', () => {
                const s = spy(a$, 'set');

                a$.value = 'b';

                expect(s).to.have.been.calledOnce.and.calledWithExactly('b');
            });
        }
    });
}
