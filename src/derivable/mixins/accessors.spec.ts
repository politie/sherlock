import { expect } from 'chai';
import { spy } from 'sinon';
import { SettableDerivable } from '../../interfaces';
import { getState, observers, unresolved } from '../../symbols';
import { addObserver } from '../../tracking';
import { ErrorWrapper } from '../../utils';
import { $, Factory } from '../base-derivable.spec';
import { constant } from '../factories';
import { isDerivableAtom, isSettableDerivable } from '../typeguards';

/**
 * Tests the `get()` method and `value` accessors.
 */
export function testAccessors(factory: Factory, noObservers: boolean) {
    describe('#get', () => {
        it('should return the current state', () => {
            const value$ = factory(123);
            expect(value$.get()).to.equal(123);

            if (isSettableDerivable(value$)) {
                value$.set(456);
                expect(value$.get()).to.equal(456);
            }
        });

        it(`should ${noObservers ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$[observers]).to.be.empty;
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$[observers]).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.get();

            if (noObservers) {
                expect(value$[observers]).to.be.empty;
            } else {
                expect(value$[observers]).to.have.length(1);
                expect(value$[observers][0]).to.equal(derived$);
            }
        });

        it('should throw an Error when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(() => a$.get()).to.throw('Could not get value, derivable is not (yet) resolved');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.get()).to.equal(1);

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(() => a$.get()).to.throw('Could not get value, derivable is not (yet) resolved');
                }
            }
        });

        it('should throw an error when the derivable is in error state', () => {
            const a$ = factory<number>(new ErrorWrapper(new Error('my error message')));
            expect(() => a$.get()).to.throw('my error message');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.get()).to.equal(1);

                if (isDerivableAtom(a$)) {
                    a$.setError(new Error('whatever'));
                    expect(() => a$.get()).to.throw('whatever');
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

        it(`should ${noObservers ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$[observers]).to.be.empty;
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$[observers]).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.getOr('whatever');

            if (noObservers) {
                expect(value$[observers]).to.be.empty;
            } else {
                expect(value$[observers]).to.have.length(1);
                expect(value$[observers][0]).to.equal(derived$);
            }
        });

        it('should return the fallback when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(a$.getOr('fallback')).to.equal('fallback');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr('fallback')).to.equal(1);

                if (isDerivableAtom(a$)) {
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

                if (isDerivableAtom(a$)) {
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

                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.getOr(fallback)).to.equal('fallback');
                }
            }
        });

        it('should throw an error when the derivable is in error state', () => {
            const a$ = factory<number>(new ErrorWrapper(new Error('my error message')));
            expect(() => a$.getOr('fallback')).to.throw('my error message');

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.getOr('fallback')).to.equal(1);

                if (isDerivableAtom(a$)) {
                    a$.setError(new Error('whatever'));
                    expect(() => a$.getOr('fallback')).to.throw('whatever');
                }
            }
        });
    });

    describe('#value', () => {
        it('should call #getState() when getting the #value property', () => {
            const a$ = factory('a');
            const s = spy($(a$), getState);

            // Use the getter
            expect(a$.value).to.equal('a');

            expect(s).to.have.been.calledOnce;
        });

        it(`should ${noObservers ? 'not ' : ''}be recorded inside a derivation'`, () => {
            const value$ = $(factory(123));
            expect(value$[observers]).to.be.empty;
            const derived$ = $(value$.derive(value => value + 876));
            expect(value$[observers]).to.be.empty;

            // Simulate being observed to force derived$ to go into connected state.
            addObserver(derived$, {} as any);
            derived$.value;

            if (noObservers) {
                expect(value$[observers]).to.be.empty;
            } else {
                expect(value$[observers]).to.have.length(1);
                expect(value$[observers][0]).to.equal(derived$);
            }
        });

        it('should return undefined when unresolved', () => {
            const a$ = factory<number>(unresolved);
            expect(a$.value).to.be.undefined;

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.value).to.equal(1);

                if (isDerivableAtom(a$)) {
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

        it('should not throw an error when the derivable is in error state', () => {
            const a$ = factory<number>(new ErrorWrapper(new Error('my error message')));
            expect(a$.value).to.be.undefined;

            if (isSettableDerivable(a$)) {
                a$.set(1);
                expect(a$.value).to.equal(1);

                if (isDerivableAtom(a$)) {
                    a$.setError(new Error('whatever'));
                    expect(a$.value).to.be.undefined;
                }
            }
        });
    });

    describe('#resolved', () => {
        it('should return the resolved status', () => {
            const a$ = factory<string>(unresolved);
            expect(a$.resolved).to.be.false;
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.resolved).to.be.true;
                if (isDerivableAtom(a$)) {
                    a$.unset();
                    expect(a$.resolved).to.be.false;
                }
            }
            const b$ = factory('with value');
            expect(b$.resolved).to.be.true;
        });
    });

    describe('#errored', () => {
        it('should return the errored status', () => {
            const a$ = factory<string>(new ErrorWrapper(0));
            expect(a$.resolved).to.be.true;
            expect(a$.errored).to.be.true;
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.resolved).to.be.true;
                expect(a$.errored).to.be.false;
                if (isDerivableAtom(a$)) {
                    a$.setError(0);
                    expect(a$.resolved).to.be.true;
                    expect(a$.errored).to.be.true;
                }
            }
            const b$ = factory('with value');
            expect(b$.resolved).to.be.true;
            expect(b$.errored).to.be.false;
        });
    });

    describe('#error', () => {
        it('should return the error when applicable', () => {
            const a$ = factory<string>(new ErrorWrapper(0));
            expect(a$.error).to.equal(0);
            if (isSettableDerivable(a$)) {
                a$.set('abc');
                expect(a$.error).to.be.undefined;
                if (isDerivableAtom(a$)) {
                    a$.setError(1);
                    expect(a$.error).to.equal(1);
                }
            }
            const b$ = factory('with value');
            expect(b$.error).to.be.undefined;
        });
    });
}
