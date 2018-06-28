import { Derivable, Fallback } from '../../interfaces';
import { unresolved } from '../../symbols';
import { derive } from '../factories';
import { resolveFallback } from '../resolve-fallback';
import { isDerivable } from '../typeguards';

export function fallbackToMethod<V, T>(this: Derivable<V>, fallback: Fallback<T>): Derivable<V | T> {
    if (isDerivable(fallback)) {
        return derive(() => this.getOr(fallback));
    }
    return this.mapState(state => state === unresolved ? resolveFallback(fallback) : state);
}
