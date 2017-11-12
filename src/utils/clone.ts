import { BaseError } from '@politie/informant';

/**
 * Creates a shallow clone of the object with the same prototype chain and working getters and setters.
 *
 * @param obj the object to clone
 */
export function clone<T extends object>(obj: T): T {
    if (Array.isArray(obj)) {
        // Special support for Array.isArray is needed because Array.isArray checks for array exotic object, which can only be made by
        // the Array constructor.
        return cloneArray(obj);
    }
    return Object.create(Object.getPrototypeOf(obj), getOwnPropertyDescriptors(obj));
}

function cloneArray<T extends any[]>(obj: T): T {
    try {
        return Object.defineProperties(new (obj.constructor as any)(), getOwnPropertyDescriptors(obj));
    } catch (e) {
        // istanbul ignore next: for debug purposes
        throw new BaseError(e, { obj }, 'could not construct a clone of the provided Array');
    }
}

// istanbul ignore next: cannot be tested in a modern Node environment
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || getOwnPropertyDescriptorsShim;

// tslint:disable-next-line:no-namespace
declare global {
    export interface ObjectConstructor {
        getOwnPropertyDescriptors(obj: any): PropertyDescriptorMap;
    }
}

export function getOwnPropertyDescriptorsShim(obj: any) {
    const properties: PropertyDescriptorMap = {};
    for (const prop of Reflect.ownKeys(obj)) { properties[prop] = Object.getOwnPropertyDescriptor(obj, prop)!; }
    return properties;
}
