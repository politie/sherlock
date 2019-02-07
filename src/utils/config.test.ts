import { atom } from '../derivable';
import { config } from './config';
import { equals } from './equals';

describe('util/config', () => {
    describe('#equals', () => {
        let returnValue: boolean;
        const defaultEquals = config.equals;
        beforeEach(() => { config.equals = jest.fn(() => returnValue); });
        afterEach(() => { config.equals = defaultEquals; });

        beforeEach(() => { returnValue = false; });

        it('should not influence equality check of primitives', () => {
            expect(equals(NaN, NaN)).toBe(true);
            expect(equals(4, 2 + 2)).toBe(true);
            expect(equals(0, 0)).toBe(true);
            expect(equals('abcd', 'ab' + 'cd')).toBe(true);

            expect(config.equals).not.toHaveBeenCalled();
        });

        it('should not influence identity check on ordinary object', () => {
            const arr: never[] = [];
            const obj = {};
            expect(equals(arr, arr)).toBe(true);
            expect(equals(obj, obj)).toBe(true);

            expect(config.equals).not.toHaveBeenCalled();

            expect(equals({}, {})).toBe(false);
            expect(config.equals).toHaveBeenCalledTimes(1);
            expect(equals([], [])).toBe(false);
            expect(config.equals).toHaveBeenCalledTimes(2);

            returnValue = true;

            expect(equals({}, {})).toBe(true);
            expect(config.equals).toHaveBeenCalledTimes(3);
            expect(equals([], [])).toBe(true);
            expect(config.equals).toHaveBeenCalledTimes(4);
        });

        it('should call the configured equals function with the values that should be compared', () => {
            returnValue = true;
            expect(equals(1, 2)).toBe(true);
            expect(config.equals).toHaveBeenCalledTimes(1);
            expect(config.equals).toHaveBeenCalledWith(1, 2);
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

            expect(a$.pluck('deeply').get()).toBeUndefined();

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

            expect(a$.pluck('deeply').get().value).toEqual({ nested: 'value' });

            const inner = a$.pluck('deeply').pluck('nested');
            expect(inner.get()).toBeInstanceOf(MyWrapper);
            expect(inner.get().property).toBe('nested');
            expect(inner.get().value).toBe('value');
            inner.set(new MyWrapper('new value'));

            expect(a$.get()).toBeInstanceOf(MyWrapper);
            expect(a$.get().value).toEqual({ deeply: { nested: 'new value' } });
        });

        afterEach(() => { config.plucker = defaultPlucker; });
    });
});
