import { atom, Derivable } from '@politie/sherlock';

export function fromPromise<V>(prom: Promise<V>): Derivable<V> {
    const atom$ = atom.unresolved<V>();
    prom.then(v => atom$.set(v), e => atom$.setError(e));
    return atom$;
}
