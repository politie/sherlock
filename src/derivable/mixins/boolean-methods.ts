import { Derivable } from '../../interfaces';
import { equals } from '../../utils';
import { isDerivable } from '../typeguards';

export function andMethod<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    if (isDerivable(other)) {
        return this.derive(v => v && other.get());
    }
    return this.map(v => v && other);
}

export function orMethod<V, W>(this: Derivable<V>, other: Derivable<W> | W): Derivable<W | V> {
    if (isDerivable(other)) {
        return this.derive(v => v || other.get());
    }
    return this.map(v => v || other);
}

export function notMethod(this: Derivable<any>): Derivable<boolean> {
    return this.map(v => !v);
}

export function isMethod(this: Derivable<any>, other: any): Derivable<boolean> {
    if (isDerivable(other)) {
        return this.derive(equals, other);
    }
    return this.map(v => equals(v, other));
}
