import { config } from './config';

/**
 * Returns whether the two arguments are either:
 * - equal according to JavaScript rules
 * - equal according to the configurable equals functions
 */
export function equals(a: any, b: any) {
    return Object.is(a, b) || config.equals(a, b);
}
