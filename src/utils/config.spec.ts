import { expect } from 'chai';
import { spy } from 'sinon';
import { atom } from '../derivable';
import { config } from './config';
import { equals } from './equals';

describe('util/config', () => {
    describe('#equals', () => {
        let returnValue: boolean;
        const defaultEquals = config.equals;
        beforeEach('set a dummy equals function', () => { config.equals = spy(() => returnValue); });
        afterEach('set a dummy equals function', () => { config.equals = defaultEquals; });

        beforeEach('set a default return value', () => { returnValue = false; });

        it('should not influence equality check of primitives', () => {
            expect(equals(NaN, NaN)).to.be.true;
            expect(equals(4, 2 + 2)).to.be.true;
            expect(equals(0, 0)).to.be.true;
            expect(equals('abcd', 'ab' + 'cd')).to.be.true;

            expect(config.equals).to.not.have.been.called;
        });

        it('should not influence identity check on ordinary object', () => {
            const arr: never[] = [];
            const obj = {};
            expect(equals(arr, arr)).to.be.true;
            expect(equals(obj, obj)).to.be.true;

            expect(config.equals).not.to.have.been.called;

            expect(equals({}, {})).to.be.false;
            expect(config.equals).to.have.been.calledOnce;
            expect(equals([], [])).to.be.false;
            expect(config.equals).to.have.been.calledTwice;

            returnValue = true;

            expect(equals({}, {})).to.be.true;
            expect(config.equals).to.have.been.calledThrice;
            expect(equals([], [])).to.be.true;
            expect(config.equals).to.have.callCount(4);
        });

        it('should call the configured equals function with the values that should be compared', () => {
            returnValue = true;
            expect(equals(1, 2)).to.be.true;
            expect(config.equals).to.have.been.calledOnce
                .and.to.have.been.calledWithExactly(1, 2);
        });
    });

    describe('#plucker', () => {
        /**
         * Simple example of an immutable wrapping class.
         */
        class MyWrapper {
            constructor(readonly value: any, readonly property?: string | number) { }
        }
        const defaultPlucker = config.plucker;

        it('should allow an arbitrary plucker implementation', () => {
            // without changed plucker:
            const a$ = atom(new MyWrapper({ deeply: { nested: 'value' } }));

            expect(a$.pluck('deeply').get()).to.be.undefined;

            config.plucker = {
                get(obj, key) {
                    if (obj instanceof MyWrapper) {
                        // Wrap on get.
                        return new MyWrapper(defaultPlucker.get.call(this, obj.value, key), key);
                    }
                    return defaultPlucker.get.call(this, obj, key);
                },
                set(newValue, oldObject, key) {
                    if (oldObject instanceof MyWrapper) {
                        // Wrap on set.
                        return new MyWrapper(defaultPlucker.set.call(this, newValue.value, oldObject.value, key), oldObject.property);
                    }
                    return defaultPlucker.set.call(this, newValue, oldObject, key);
                }
            };

            expect(a$.pluck('deeply').get().value).to.deep.equal({ nested: 'value' });

            const inner = a$.pluck('deeply').pluck('nested');
            expect(inner.get()).to.be.instanceOf(MyWrapper);
            expect(inner.get().property).to.equal('nested');
            expect(inner.get().value).to.equal('value');
            inner.set(new MyWrapper('new value'));

            expect(a$.get()).to.be.instanceOf(MyWrapper);
            expect(a$.get().value).to.deep.equal({ deeply: { nested: 'new value' } });
        });

        afterEach('restore the default plucker', () => { config.plucker = defaultPlucker; });
    });
});
