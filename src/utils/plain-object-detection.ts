/**
 * Function to test if an object is a plain object, i.e. is constructed
 * by the built-in Object constructor or inherits directly from Object.prototype
 * or null. Some built-in objects pass the test, e.g. Math which is a plain object
 * and some host or exotic objects may pass also.
 *
 * @param obj the object to test
 */
export function isPlainObject(obj: any): obj is object {
    // Basic check for type 'object' that's not null
    if (typeof obj !== 'object' || obj == null) {
        return false;
    }

    const proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null || obj.constructor === Object;
}
