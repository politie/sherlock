import { _internal, atom, Derivable, ReactorOptions } from '@politie/sherlock';
import { Observable, Subscriber, Subscription } from 'rxjs';

// Adds the toObservable method to Derivable.
declare module '@politie/sherlock/derivable/extension' {
    export interface DerivableExtension<V> {
        /**
         * Create an RxJS Observable from this Derivable. The Observable stream can be tweaked with the same options that
         * can also be used with {@link Derivable#react}.
         *
         * @param options optional options that indicate how to transform the Derivable into an Observable stream
         */
        toObservable(options?: Partial<ReactorOptions<V>>): Observable<V>;
    }
}

_internal.BaseDerivable.prototype.toObservable = function toObservable<V>(
    this: _internal.BaseDerivable<V>,
    options?: Partial<ReactorOptions<V>>,
) {
    return new Observable<V>((subscriber: Subscriber<V>) => {
        return _internal.Reactor.create(this,
            // onValue: notify subscriber
            value => subscriber.next(value),
            // Merge the options with the default options.
            options,
            // onComplete: notify subscriber unless explicitly unsubscribed
            () => subscriber.closed || subscriber.complete(),
        );
    });
};

export function fromObservable<V>(observable: Observable<V>): Derivable<V> {
    const atom$ = atom.unresolved<V>();

    let subscription: Subscription | undefined;
    atom$.connected$.react(connected => {
        if (connected) {
            subscription = observable.subscribe(
                value => atom$.set(value),
                err => atom$.setError(err),
            );
        } else {
            subscription!.unsubscribe();
            subscription = undefined;
            atom$.unset();
        }
    }, { skipFirst: true });

    return atom$;
}
