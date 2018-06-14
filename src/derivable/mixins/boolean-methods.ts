import { equals, unpack } from '../../utils';
import { Derivable } from '../interfaces';

export function andMethod<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    return this.derive(v => v && unpack(other));
}

export function orMethod<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    return this.derive(v => v || unpack(other));
}

export function notMethod(this: Derivable<any>): Derivable<boolean> {
    return this.derive(v => !v);
}

export function isMethod(this: Derivable<any>, other: any): Derivable<boolean> {
    return this.derive(equals, other);
}
