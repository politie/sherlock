import { Derivable } from '../../interfaces';

export function flatMapMethod<V, T>(this: Derivable<V>, deriver: (value: V) => Derivable<T>): Derivable<T> {
    return this.map(deriver).derive(v => v.getState());
}
