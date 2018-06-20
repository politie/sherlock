import { _internals, DataSource, Derivable, Fallback, ReactorOptions, symbols, utils } from '@politie/sherlock';
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

_internals.BaseDerivable.prototype.toObservable = function toObservable<V>(
    this: _internals.BaseDerivable<V>,
    options?: Partial<ReactorOptions<V>>,
) {
    return new Observable<V>((subscriber: Subscriber<V>) => {
        return _internals.Reactor.create(this,
            // onValue: notify subscriber
            value => subscriber.next(value),
            // Merge the options with the default options.
            options,
            // onComplete: notify subscriber unless explicitly unsubscribed
            () => subscriber.closed || subscriber.complete(),
        );
    });
};

const error = Symbol('error');

class FromObservable<V> extends DataSource<V> {
    private currentValue: V | typeof symbols.unresolved | typeof error = symbols.unresolved;
    private currentError?: any;
    private subscription?: Subscription;

    constructor(
        private readonly observable: Observable<V>,
        private readonly fallback?: Fallback<V>,
    ) { super(); }

    onConnect() {
        this.subscription = this.observable.subscribe(
            value => {
                this.currentValue = value;
                this.checkForChanges();
            },
            err => {
                this.currentValue = error;
                this.currentError = err;
                this.checkForChanges();
            }
        );
    }

    onDisconnect() {
        this.subscription!.unsubscribe();
        this.subscription = undefined;
        this.currentValue = symbols.unresolved;
        this.currentError = undefined;
    }

    calculateCurrentValue() {
        if (this.currentValue === error) {
            throw this.currentError;
        }
        if (this.currentValue === symbols.unresolved && this.fallback) {
            return utils.resolveFallback(this.fallback);
        }
        return this.currentValue;
    }
}

export function fromObservable<V>(observable: Observable<V>, fallback?: Fallback<V>): Derivable<V> {
    return new FromObservable(observable, fallback);
}
