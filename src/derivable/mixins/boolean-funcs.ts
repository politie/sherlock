import { equals, unpack } from '../../utils';
import { Derivable } from '../interfaces';

// Implementations:

export function and<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    // Need to cast because of https://github.com/Microsoft/TypeScript/issues/24443
    return this.derive(v => (v && unpack(other)) as W | V);
}

export function or<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    // Need to cast because of https://github.com/Microsoft/TypeScript/issues/24443
    return this.derive(v => (v || unpack(other)) as W | V);
}

export function not(this: Derivable<any>): Derivable<boolean> {
    return this.derive(v => !v);
}

export function is(this: Derivable<any>, other: any): Derivable<boolean> {
    return this.derive(equals, other);
}
