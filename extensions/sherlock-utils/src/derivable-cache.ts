import { _internal, Derivable, isDerivable, isSettableDerivable, lens, LensDescriptor, SettableDerivable, Unwrappable } from '@politie/sherlock';

export interface MapImplementation<K, V> {
    set(key: K, value: V): void;
    delete(key: K): void;
    get(key: K): V | undefined;
}

export interface DerivableCacheOptions<K, V> {
    derivableFactory(key: K): Derivable<V>;
    mapFactory?(): MapImplementation<K, Derivable<V>>;
    delayedEviction?: boolean;
}

export type DerivableCache<K, V> = (key: Unwrappable<K>) => SettableDerivable<V>;

function defaultMapFactory<K, V>(): MapImplementation<K, V> { return new Map; }

const CACHED_PROXY = '__cachedProxy';

export function derivableCache<K, V>(opts: DerivableCacheOptions<K, V>): DerivableCache<K, V> {
    const cache = (opts.mapFactory || defaultMapFactory)();

    const { delayedEviction, derivableFactory } = opts;
    const descriptor: LensDescriptor<V, K> = {
        get(key) {
            let derivable = cache.get(key);
            // If the cache has a hit for the current key, we know it is already connected (through another proxy).
            if (derivable) {
                return derivable.getState();
            }

            // A cache miss means no other proxy is currently connected.
            derivable = _internal.independentTracking(() => derivableFactory(key));
            if (derivable instanceof _internal.Constant) {
                // Enable connection administration (constants cannot be connected)
                derivable = derivable.map(v => v);
            }
            if (delayedEviction) {
                derivable.autoCache();
            }
            // Get the state of our derivable early so it connects when needed.
            const state = derivable.getState();
            if (derivable.connected) {
                derivable[CACHED_PROXY] = this;
                cache.set(key, derivable);
                derivable.connected$.react(() => cache.delete(key), { skipFirst: true, once: true });
            }
            return state;
        },
        set(newValue, key) {
            const derivable = cache.get(key) || derivableFactory(key);
            if (!isSettableDerivable(derivable)) {
                throw new Error('Cached derivable is not settable');
            }
            derivable.set(newValue);
        },
    };

    return key => {
        if (!isDerivable(key)) {
            const cacheItem = cache.get(key);
            if (cacheItem) {
                return cacheItem[CACHED_PROXY];
            }
        }

        return lens(descriptor, key);
    };
}
