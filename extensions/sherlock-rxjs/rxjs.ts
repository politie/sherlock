import { _internal, atom, Derivable, ErrorWrapper, ReactorOptions } from '@politie/sherlock';
import { Observable, Subscribable, Subscriber, Unsubscribable } from 'rxjs';

/**
 * Creates an RxJS Observable from a Derivable. Optionally accepts a `ReactorOptions` that governs RxJS emissions
 * and lifecycle equivalent to {@link Derivable#react} {@link ReactorOptions}.
 * @param derivable Derivable to create an RxJS Observable from.
 * @param options Partial `ReactorOptions`.
 */
export function toObservable<V>(derivable: Derivable<V>, options?: Partial<ReactorOptions<V>>): Observable<V> {
    return new Observable<V>((subscriber: Subscriber<V>) => {
        return _internal.Reactor.create(derivable as _internal.BaseDerivable<V>,
            value => subscriber.next(value),
            options,
            () => subscriber.closed || subscriber.complete(),
        );
    });
}

export function fromObservable<V>(observable: Subscribable<V>): Derivable<V> {
    const atom$ = atom.unresolved<V>();

    let subscription: Unsubscribable | undefined;
    atom$.connected$.react(connected => {
        if (connected) {
            subscription = observable.subscribe(
                value => atom$.set(value),
                err => atom$.setFinal(new ErrorWrapper(err)),
                () => atom$.setFinal(atom$.getState()),
            );
        } else {
            subscription!.unsubscribe();
            subscription = undefined;
        }
    }, { skipFirst: true });

    return atom$;
}
