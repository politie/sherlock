import { atom, Derivable, ErrorWrapper } from '@politie/sherlock';

export function fromPromise<V>(prom: Promise<V>): Derivable<V> {
    const atom$ = atom.unresolved<V>();
    prom.then(v => atom$.setFinal(v), e => atom$.setFinal(new ErrorWrapper(e)));
    return atom$;
}
