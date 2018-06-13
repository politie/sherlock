import { clone } from './clone';

export const config = {
    /**
     * Configurable equals function that is used to check equality of values in Sherlock. It can be overwritten by
     * changing this property on the config object. Note that the equals function is only called with arguments that
     * are not equal according to JavaScript rules (`Object.is(a, b)`), it is not possible to skip this default
     * equality check.
     *
     * By default the equals function checks for an `equals` method on the first arguments and
     * uses that to check for equality with the second argument. This enables full support for ImmutableJS and other
     * libraries that use that particular pattern.
     */
    equals: defaultEquals,

    /**
     * Configurable plucker that is used inside the `pluck` method of Derivables. By default it looks for a `get` and
     * a `set` method on the value inside the derivable, otherwise it will use simple property access.
     *
     * The default behavior on setting a plain object is to clone the object and replace the plucked property with the
     * provided value. Example:
     *
     *    const a$ = atom({ property: 'value', otherProp: 123 });
     *    const d$ = a$.pluck('property');
     *    d$.get();            // 'value'
     *    d$.set('new value'); // This will clone the original object and set 'property' to 'new value';
     *    a$.get();            // { property: 'new value', otherProp: 123 }
     */
    plucker: {
        get: defaultPluckGetter,
        set: defaultPluckSetter,
    },

    /**
     * Enable debug mode. This records stack-traces on creation of derivables to be able to find the origin when
     * a derivable errors. Has a dramatic performance impact, so only use for debugging.
     */
    debugMode: false,
};

function defaultEquals(a: any, b: any) {
    return hasEqualsMethod(a) && !!a.equals(b);
}

function hasEqualsMethod(obj: any): obj is { equals(other: any): any; } {
    return obj && typeof obj.equals === 'function';
}

function defaultPluckGetter(obj: any, key: string | number) {
    return hasGetter(obj)
        ? obj.get(key)
        : obj[key];
}

function hasGetter(obj: any): obj is { get(key: string | number): any } {
    return obj && typeof obj.get === 'function';
}

function defaultPluckSetter(newValue: any, object: any, key: string | number) {
    if (hasGetter(object)) {
        if (hasSetter(object)) {
            return object.set(key, newValue);
        }
        throw new Error('object is readonly');
    }
    const result = clone(object);
    result[key] = newValue;
    return result;
}

function hasSetter(obj: any): obj is { set(key: string | number, value: any): any } {
    return typeof obj.set === 'function';
}
