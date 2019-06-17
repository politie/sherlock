import { clone } from './clone';

describe('util/clonex', () => {
    it('should clone an instance of a class', () => {
        class Super {
            superProp = 'superPropValue';
            otherSuperProp?: string;
        }
        class Sub extends Super {
            subProp = 'subPropValue';
            otherSubProp?: string;
        }
        const sub = new Sub;
        sub.otherSuperProp = 'otherSuperProp';
        sub.otherSubProp = 'otherSubProp';
        const copy = clone(sub);
        expect(copy).toBeInstanceOf(Sub);
        expect(copy).toBeInstanceOf(Super);
        expect(copy).not.toBe(sub);
        expect(copy).toEqual(sub);
    });

    it('should clone an Array', () => {
        const array: number[] & { randomProp?: string } = [1, 2, 3];
        array.randomProp = 'abc';
        const copy = clone(array);
        expect(Array.isArray(copy)).toBe(true);
        expect(copy).toBeInstanceOf(Array);
        expect(copy).not.toBe(array);
        expect(copy).toEqual(array);
        expect(copy.randomProp).toBe('abc');
    });

    it('should clone a subclass of Array', () => {
        class MyArray extends Array {
            myProp?: string;

            constructor(arrayLength?: number) {
                super(arrayLength);
                // Set the prototype explicitly to work around TypeScript limitation:
                // https://github.com/Microsoft/TypeScript/wiki/FAQ#why-doesnt-extending-built-ins-like-error-array-and-map-work
                Object.setPrototypeOf(this, MyArray.prototype);
            }
        }
        const array = new MyArray(4);
        array.myProp = 'myValue';
        expect(array).toHaveLength(4);
        expect(array).toBeInstanceOf(MyArray);
        expect(Array.isArray(array)).toBe(true);
        const copy = clone(array);
        expect(copy).toBeInstanceOf(Array);
        expect(copy).toBeInstanceOf(MyArray);
        expect(copy).toHaveLength(4);
        expect(copy).not.toBe(array);
        expect(copy).toEqual(array);
        expect(copy.myProp).toBe('myValue');
    });

    it('should clonex getters and setters by implementation, not by value', () => {
        const obj = {
            value: 'abc',
            get prop() { return this.value; },
            set prop(newValue) { this.value = newValue; },
        };
        const copy = clone(obj);
        expect(copy.value).toBe('abc');
        expect(copy.prop).toBe('abc');
        copy.prop = 'def';
        expect(copy.value).toBe('def'); // verify value was changed by setter
        expect(copy.prop).toBe('def');
        expect(obj.value).toBe('abc');
    });

    it('should clonex all own properties of the object even not enumerable ones', () => {
        const obj = Object.create(null, {
            prop1: {
                enumerable: false,
                configurable: false,
                writable: false,
                value: 'value',
            },
        });
        const copy = clone(obj);
        expect(copy.prop1).toBe('value');
    });
});
