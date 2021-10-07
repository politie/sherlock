/**
 * Check whether the `unknown` type input is an object with a `message` property.
 */
export function isError(x: unknown): x is Error {
    if (!x || typeof x !== 'object') {
        return false;
    }
    const xObj = x as any;

    return (
        typeof xObj.message === 'string'
        && typeof xObj.name === 'string'
        && (xObj.stack === undefined || typeof xObj.stack === 'string')
    );
}
