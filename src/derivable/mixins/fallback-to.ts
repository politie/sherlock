import { Derivable, Fallback } from '../../interfaces';
import { derive } from '../factories';

export function fallbackToMethod<V, T>(this: Derivable<V>, fallback: Fallback<T>): Derivable<V | T> {
    return derive(() => this.getOr(fallback));
}
