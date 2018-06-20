import { expect } from 'chai';
import { spy } from 'sinon';
import { Derivable, SettableDerivable, Unsettable } from '../../interfaces';
import { addObserver } from '../../tracking';
import { $ } from '../base-derivable.spec';
import { constant } from '../factories';
import { getValueOrUnresolved, unresolved } from '../symbols';
import { isSettableDerivable } from '../typeguards';

/**
 * Tests the `get()` method and `value` accessors.
 */
export function testAccessors(factory: <V>(value: V | typeof unresolved) => Derivable<V>, immutable: boolean) {
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

        it('should throw an Error when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(() => a$.get()).to.throw('Could not get value, derivable is not (yet) resolved');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.get()).to.equal(1);

                if (isUnsettable(a$)) {
                    a$.unset();
                    expect(() => a$.get()).to.throw('Could not get value, derivable is not (yet) resolved');
                }
            }
        });
    });

    describe('#getOr', () => {
        it('should return the current state', () => {
            const value$ = factory(123);
            expect(value$.getOr('whatever')).to.equal(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.getOr('whatever')).to.equal(456);
            }
        });

        it(`should ${immutable ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$.observers).to.be.empty;
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$.observers).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.getOr('whatever');

            if (immutable) {
                expect(value$.observers).to.be.empty;
            } else {
                expect(value$.observers).to.have.length(1);
                expect(value$.observers[0]).to.equal(derived$);
            }
        });

        it('should return the fallback when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(a$.getOr('fallback')).to.equal('fallback');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr('fallback')).to.equal(1);

                if (isUnsettable(a$)) {
                    a$.unset();
                    expect(a$.getOr('fallback')).to.equal('fallback');
                }
            }
        });

        it('should call the provided function when unresolved', () => {
            const a$ = factory<number>(unresolved);
            const fallback = spy(() => 'fallback');
            expect(a$.getOr(fallback)).to.equal('fallback');
            expect(fallback).to.have.been.calledOnce;

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr(fallback)).to.equal(1);
                expect(fallback).to.have.been.calledOnce;

                if (isUnsettable(a$)) {
                    a$.unset();
                    expect(a$.getOr(fallback)).to.equal('fallback');
                    expect(fallback).to.have.been.calledTwice;
                }
            }
        });

        it('should fallback to the provided derivable when unresolved', () => {
            const a$ = factory<number>(unresolved);
            const fallback = constant('fallback');
            expect(a$.getOr(fallback)).to.equal('fallback');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr(fallback)).to.equal(1);

                if (isUnsettable(a$)) {
                    a$.unset();
                    expect(a$.getOr(fallback)).to.equal('fallback');
                }
            }
        });
    });

    describe('#value', () => {
        it('should call #getValueOrUnresolved() when getting the #value property', () => {
            const a$ = factory('a');
            const s = spy($(a$), getValueOrUnresolved);

            // Use the getter
            expect(a$.value).to.equal('a');

            expect(s).to.have.been.calledOnce;
        });

        it(`should ${immutable ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$.observers).to.be.empty;
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$.observers).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.value;

            if (immutable) {
                expect(value$.observers).to.be.empty;
            } else {
                expect(value$.observers).to.have.length(1);
                expect(value$.observers[0]).to.equal(derived$);
            }
        });

        it('should return undefined when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(a$.value).to.be.undefined;

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.value).to.equal(1);

                if (isUnsettable(a$)) {
                    a$.unset();
                    expect(a$.value).to.be.undefined;
                }
            }
        });

        if (isSettableDerivable(factory(''))) {
            it('should call #set() when setting the #value property', () => {
                const a$ = factory('a') as SettableDerivable<string>;
                const s = spy(a$, 'set');

                a$.value = 'b';

                expect(s).to.have.been.calledOnce.and.calledWithExactly('b');
            });
        }
    });

    describe('#resolved', () => {
        it('should return the resolved status', () => {
            const a$ = factory<string>(unresolved);
            expect(a$.resolved).to.be.false;
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.resolved).to.be.true;
            }
            const b$ = factory('with value');
            expect(b$.resolved).to.be.true;
        });
    });
}

export function isUnsettable(obj: any): obj is Unsettable {
    return obj && typeof (obj as Unsettable).unset === 'function';
}
