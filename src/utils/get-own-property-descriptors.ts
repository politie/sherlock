
// istanbul ignore next: cannot be tested in a modern Node environment
export const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || getOwnPropertyDescriptorsShim;

// tslint:disable-next-line:no-namespace
declare global {
    export interface ObjectConstructor {
        getOwnPropertyDescriptors(obj: any): PropertyDescriptorMap;
    }
}

export function getOwnPropertyDescriptorsShim(obj: any) {
    const properties: PropertyDescriptorMap = {};
    for (const prop of ownKeys(obj)) { properties[prop] = Object.getOwnPropertyDescriptor(obj, prop)!; }
    return properties;
}

// istanbul ignore next: cannot be tested in a modern Node environment
const ownKeys = typeof Reflect !== 'undefined' ? Reflect.ownKeys : ownKeysShim;

export function ownKeysShim(obj: any) {
    return [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)];
}
