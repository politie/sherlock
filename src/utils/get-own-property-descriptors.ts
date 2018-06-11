
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
    // FIXME: symbol cannot be used as index after TS2.9 because of: https://github.com/Microsoft/TypeScript/issues/1863
    // when fixed, the `as any` can be removed
    for (const prop of ownKeys(obj)) { properties[prop as any] = Object.getOwnPropertyDescriptor(obj, prop)!; }
    return properties;
}

// istanbul ignore next: cannot be tested in a modern Node environment
const ownKeys = typeof Reflect !== 'undefined' ? Reflect.ownKeys : ownKeysShim;

export function ownKeysShim(obj: any) {
    return [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)];
}
