/**
 * Returns whether the two arguments are either:
 * - equal according to JavaScript rules
 * - equal immutable objects
 * - equal derivables
 * - equal derivable proxies
 */
export function equals(a: any, b: any) {
    return Object.is(a, b)
        || hasEqualsMethod(a) && !!a.equals(b);
}

export function hasEqualsMethod(obj: any): obj is { equals(other: any): any; } {
    return obj && typeof obj.equals === 'function';
}
