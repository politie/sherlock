import { expect } from 'chai';
import { clone, getOwnPropertyDescriptorsShim, ownKeysShim } from './clone';

describe('util/clonex', () => {
    it('should clone an instance of a class', () => {
        class Super {
            superProp = 'superPropValue';
            otherSuperProp: string;
        }
        class Sub extends Super {
            subProp = 'subPropValue';
            otherSubProp: string;
        }
        const sub = new Sub;
        sub.otherSuperProp = 'otherSuperProp';
        sub.otherSubProp = 'otherSubProp';
        const copy = clone(sub);
        expect(copy).to.be.an.instanceOf(Sub);
        expect(copy).to.be.an.instanceOf(Super);
        expect(copy).not.to.equal(sub);
        expect(copy).to.deep.equal(sub);
    });

    it('should clone an Array', () => {
        const array: number[] & { randomProp?: string } = [1, 2, 3];
        array.randomProp = 'abc';
        const copy = clone(array);
        expect(Array.isArray(copy)).to.be.true;
        expect(copy).to.be.an.instanceOf(Array);
        expect(copy).not.to.equal(array);
        expect(copy).to.deep.equal(array);
        expect(copy.randomProp).to.equal('abc');
    });

    it('should clone a subclass of Array', () => {
        class MyArray extends Array {
            myProp: string;

            constructor(arrayLength?: number) {
                super(arrayLength);
                // Set the prototype explicitly to work around TypeScript limitation:
                // https://github.com/Microsoft/TypeScript/wiki/FAQ#why-doesnt-extending-built-ins-like-error-array-and-map-work
                Object.setPrototypeOf(this, MyArray.prototype);
            }
        }
        const array = new MyArray(4);
        array.myProp = 'myValue';
        expect(array, 'original').to.have.length(4);
        expect(array, 'original').to.be.an.instanceOf(MyArray);
        expect(Array.isArray(array), 'original').to.be.true;
        const copy = clone(array);
        expect(copy).to.be.an.instanceOf(Array);
        expect(copy).to.be.an.instanceOf(MyArray);
        expect(copy).to.have.length(4);
        expect(copy).not.to.equal(array);
        expect(copy).to.deep.equal(array);
        expect(copy.myProp).to.equal('myValue');
    });

    it('should clonex getters and setters by implementation, not by value', () => {
        const obj = {
            value: 'abc',
            get prop() { return this.value; },
            set prop(newValue) { this.value = newValue; },
        };
        const copy = clone(obj);
        expect(copy.value).to.equal('abc');
        expect(copy.prop).to.equal('abc');
        copy.prop = 'def';
        expect(copy.value).to.equal('def'); // verify value was changed by setter
        expect(copy.prop).to.equal('def');
        expect(obj.value).to.equal('abc');
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
        expect(copy.prop1).to.equal('value');
    });

    Object.getOwnPropertyDescriptors && it('should use a correct Object.getOwnPropertyDescriptors shim', () => {
        const obj = { a: 'b', c: 123, get d() { return false; } };
        expect(getOwnPropertyDescriptorsShim(obj)).to.deep.equal(Object.getOwnPropertyDescriptors(obj));
    });

    typeof Reflect !== 'undefined' && it('should use a correct Reflect.ownKeys shim', () => {
        const obj = { a: 'b', c: 123, get d() { return false; }, [Symbol()]: {} };
        expect(ownKeysShim(obj)).to.deep.equal(Reflect.ownKeys(obj));
    });
});
