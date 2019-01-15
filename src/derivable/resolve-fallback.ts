import { Fallback } from '../interfaces';
import { unwrap } from './unwrap';

export function resolveFallback<V>(fallback: Fallback<V>): V {
    return typeof fallback === 'function' ? (fallback as () => V)() : unwrap(fallback);
}
