import { _internal, DataSource, Derivable, ReactorOptions, State } from '@politie/sherlock';
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

class FromObservable<V> extends DataSource<V> {
    private _state: State<V> = _internal.symbols.unresolved;
    private subscription?: Subscription;

    constructor(private readonly observable: Observable<V>) { super(); }

    onConnect() {
        this.subscription = this.observable.subscribe(
            value => {
                this._state = value;
                this.checkForChanges();
            },
            err => {
                this._state = new _internal.ErrorWrapper(err);
                this.checkForChanges();
            }
        );
    }

    onDisconnect() {
        this.subscription!.unsubscribe();
        this.subscription = undefined;
        this._state = _internal.symbols.unresolved;
    }

    calculateCurrentValue() {
        return this._state;
    }
}

export function fromObservable<V>(observable: Observable<V>): Derivable<V> {
    return new FromObservable(observable);
}
