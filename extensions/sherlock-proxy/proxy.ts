import { clone, Derivable, isDerivable, isSettableDerivable, ReactorOptions, TargetedLensDescriptor } from '@politie/sherlock';

/**
 * The base interface for DerivableProxies. Defines only the $-properties and $-methods. Any property accessed with a number or
 * that doesn't start with a $-sign returns a new DerivableProxy.
 */
export interface DerivableProxy<V> {
    /** The current value that this Proxy represents. Can be expensive to calculate and is often writable. */
    $value: V;

    /** A string representation of this proxy's path from the root ProxyDescriptor. */
    $expression?: string;

    /**
     * An array representation of this proxy's path from the root ProxyDescriptor. Useful for programatically walking down the root
     * Descriptor's object tree to reacquire a target proxy.
     */
    $path?: Array<string | number>;

    /** {@see Derivable#and} */
    $and<W>(other: MaybePacked<W>): Derivable<V | W>;

    /** {@see Derivable#or} */
    $or<W>(other: MaybePacked<W>): Derivable<V | W>;

    /** {@see Derivable#not} */
    $not(): Derivable<boolean>;

    /** {@see Derivable#is} */
    $is(other: MaybePacked<any>): Derivable<boolean>;

    /** {@see Derivable#derive} */
    $derive<R>(f: (v: V) => R): Derivable<R>;
    $derive<R, P1>(f: (v: V, p1: P1) => R, p1: MaybePacked<P1>): Derivable<R>;
    $derive<R, P1, P2>(f: (v: V, p1: P1, p2: P2) => R, p1: MaybePacked<P1>, p2: MaybePacked<P2>): Derivable<R>;
    $derive<R, P>(f: (v: V, ...ps: P[]) => R, ...ps: Array<MaybePacked<P>>): Derivable<R>;

    /** {@see Derivable#react} */
    $react(reaction: (value: V) => void, options?: Partial<ReactorOptions<V>>): () => void;
}

const IS_DERIVABLE_PROXY = Symbol('isDerivableProxy');

/**
 * Returns whether obj is a DerivableProxy.
 *
 * @param obj the object to test
 */
export function isDerivableProxy(obj: any): obj is DerivableProxy<any> {
    return obj[IS_DERIVABLE_PROXY] === true;
}

/**
 * A ProxyDescriptor must be used to create DerivableProxies. It can be used in two ways, either create a new descriptor and
 * change any implementation details (if needed) or create a subclass to extend the behavior. Use the {@link #$create} method
 * to create a DerivableProxy.
 *
 * Note that `this` in methods points to the created proxy, so only methods and properties that start with a $-sign can be accessed
 * without trouble.
 *
 * Note also that properties that start with two $-signs are cleared on $create.
 */
export class ProxyDescriptor<V = any, T = V> {
    /**
     * The target derivable (the input to the proxy and the {@link #$create} method). The actual values that can be seed by methods
     * on the Proxy can be influenced by providing a {@link #$lens}.
     */
    $target!: Derivable<T>;

    /**
     * The expression that represents the path to the current Proxy.
     */
    $expression?: string;

    /**
     * The path to the current Proxy.
     */
    $path?: Array<string | number>;

    /**
     * The derivable that is the input to all default methods on the Proxy and the {@link #$value} property.
     */
    get $derivable(): Derivable<V> {
        const pd = this.$proxyDescriptor;
        return pd.$$derivable || (pd.$$derivable = createDerivable(pd.$target, pd.$lens && pd.$lens()));
    }
    private $$derivable?: Derivable<V> = undefined;

    /**
     * The current value of the DerivableProxy. Can be expensive to calculate. When the target is settable (is an Atom) then $value
     * is writable.
     */
    get $value() {
        const pd = this.$proxyDescriptor;
        try {
            return pd.$derivable.get();
        } catch (e) {
            // istanbul ignore next: for debug purposes
            throw Object.assign(new Error(`error while getting ${pd.$expression || '$value'}: ${e && e.message}`), { jse_cause: e });
        }
    }
    set $value(newValue) {
        const pd = this.$proxyDescriptor;
        const atom = pd.$derivable;
        const expression = pd.$expression;
        if (!isSettableDerivable(atom)) {
            throw new Error(`${expression || '$value'} is readonly`);
        }
        try {
            atom.set(newValue);
        } catch (e) {
            throw Object.assign(new Error(`error while setting ${expression || '$value'}: ${e && e.message}`), { jse_cause: e });
        }
    }

    /**
     * The current value of the target Derivable that was used to create the DerivableProxy.
     */
    get $targetValue() {
        const pd = this.$proxyDescriptor;
        try {
            return pd.$target.get();
        } catch (e) {
            // istanbul ignore next: for debug purposes
            throw Object.assign(new Error(`error while getting ${pd.$expression || '$targetValue'}: ${e && e.message}`), { jse_cause: e });
        }
    }
    set $targetValue(newValue) {
        const pd = this.$proxyDescriptor;
        const atom = pd.$target;
        const expression = pd.$expression;
        if (!isSettableDerivable(atom)) {
            throw new Error(`${expression || '$targetValue'} is readonly`);
        }
        try {
            atom.set(newValue);
        } catch (e) {
            throw Object.assign(new Error(`error while setting ${expression || '$targetValue'}: ${e && e.message}`), { jse_cause: e });
        }
    }

    /**
     * In methods of a ProxyDescriptor, `this` is bound to the Proxy Object. Therefore, only $-properties and $-methods can be
     * accessed safely. Use $proxyDescriptor to get access to the ProxyDescriptor Object to prevent the ProxyHandler from messing
     * with your logic.
     */
    protected get $proxyDescriptor() { return this; }

    /**
     * An optional method that can return an optional lens to this proxy. Is used to transform the values before accessed by the
     * consumer of the Proxy (either through $value or one of the other methods).
     */
    $lens?(): DerivableProxyLens<T, V> | undefined;

    /**
     * Wrap a Derivable as DerivableProxy using this ProxyDescriptor.
     *
     * @param obj the object to wrap
     * @param expression the new expression to the created DerivableProxy
     * @param path the new path to the created DerivableProxy
     */
    $create(obj: Derivable<T>, expression?: string, path?: Array<string | number>): DerivableProxy<V> {
        const descriptor: ProxyDescriptor = clone(this.$proxyDescriptor);
        descriptor.$target = obj;
        Object.getOwnPropertyNames(descriptor)
            .filter(prop => prop.startsWith('$$'))
            .forEach(prop => descriptor[prop] = undefined);
        descriptor.$expression = expression;
        descriptor.$path = path;
        return new Proxy(descriptor, proxyHandler) as any;
    }

    /**
     * The $pluck method is the implementation of the pluck mechanism of DerivableProxy. Replace this method to change the
     * pluck behavior. It should return a DerivableProxy.
     *
     * @param prop the property to pluck of the wrapped derivable
     */
    $pluck(prop: string | number): DerivableProxy<V> | undefined {
        const pd = this.$proxyDescriptor;
        return pd.$create(pd.$derivable.pluck(prop), extendExpression(pd.$expression, prop), extendPath(pd.$path, prop));
    }

    /**
     * The $pluckableKeys returns a list of properties that can be plucked from this object. Returned keys are guaranteed to
     * result in a usable DerivableProxy when used with $pluck. Is used for `for ... in` and `Object.keys(...)` logic.
     */
    $pluckableKeys() {
        const value = this.$proxyDescriptor.$value;
        return typeof value === 'object' ? Reflect.ownKeys(value as any) : [];
    }

    /**
     * Method that determines whether the current object is iterable and if so, how many elements it contains. During iteration
     * {@link #pluck} is called with indices up to but not including the result of `$length()`.
     */
    $length(): number | undefined {
        const maybeArray = this.$proxyDescriptor.$targetValue;
        return Array.isArray(maybeArray) ? maybeArray.length : undefined;
    }

    $and(other: MaybePacked<any>) {
        return this.$proxyDescriptor.$derivable.and(unpackProxy(other));
    }

    $or(other: MaybePacked<any>) {
        return this.$proxyDescriptor.$derivable.or(unpackProxy(other));
    }

    $not() {
        return this.$proxyDescriptor.$derivable.not();
    }

    $is(other: MaybePacked<any>) {
        return this.$proxyDescriptor.$derivable.is(unpackProxy(other));
    }

    $derive() {
        const target = this.$proxyDescriptor.$derivable;
        return target.derive.apply(target, arguments);
    }

    $react(reaction: (value: V) => void, options?: Partial<ReactorOptions<any>>): () => void {
        return this.$proxyDescriptor.$derivable.react(reaction, options);
    }

    toJSON() {
        return this.$proxyDescriptor.$value;
    }

    get [Symbol.toStringTag]() {
        return 'DerivableProxy';
    }

    *[Symbol.iterator](): IterableIterator<DerivableProxy<V>> {
        const pd = this.$proxyDescriptor;
        const length = pd.$length();
        if (length === undefined) {
            const expression = pd.$expression;
            throw Object.assign(new Error(`${expression || 'object'} is not iterable`), { value: pd.$value, expression });
        }
        for (let i = 0; i < length; i++) {
            yield pd.$pluck(i)!;
        }
    }

    get length() {
        return this.$proxyDescriptor.$length();
    }
}
ProxyDescriptor.prototype[IS_DERIVABLE_PROXY] = true;

function createDerivable<V, T>(target: Derivable<T>, lens?: DerivableProxyLens<T, V>): Derivable<V> {
    if (!lens) {
        return target as any;
    }
    if (!lens.set || !isSettableDerivable(target)) {
        return target.derive(lens.get).autoCache();
    }
    return target.lens(lens as TargetedLensDescriptor<T, V, never>).autoCache();
}

export interface DerivableProxyLens<T, V> {
    get: TargetedLensDescriptor<T, V, never>['get'];
    set?: TargetedLensDescriptor<T, V, never>['set'];
}

export type MaybePacked<T> = T | Derivable<T> | DerivableProxy<T>;

export function unpackProxy<W>(obj: MaybePacked<W>): W | Derivable<W> {
    if (isDerivableProxy(obj)) {
        return (obj as any).$derivable;
    }
    return obj;
}

const proxyHandler: ProxyHandler<ProxyDescriptor> = {
    get(target, prop, receiver) {
        if (prop === '$proxyDescriptor') {
            return target;
        }
        if (isPluckableProperty(target, prop)) {
            return target.$pluck.call(receiver, prop);
        }
        return Reflect.get(target, prop, receiver);
    },
    set(target, prop, newValue, receiver) {
        if (isPluckableProperty(target, prop)) {
            const plucked = target.$pluck.call(receiver, prop);
            if (newValue && isDerivableProxy(newValue)) {
                plucked.$targetValue = (newValue as any).$targetValue;
            } else {
                plucked.$value = newValue && isDerivable(newValue) ? newValue.get() : newValue;
            }
            return true;
        }
        return Reflect.set(target, prop, newValue, receiver);
    },
    has(target, prop) {
        if (prop === Symbol.iterator) {
            return target.$length() !== undefined;
        }
        return isPluckableProperty(target, prop);
    },
    getOwnPropertyDescriptor(target, prop) {
        if (isPluckableProperty(target, prop)) {
            return {
                get() { return this[prop]; },
                set(newValue) { this[prop] = newValue; },
                configurable: true,
                enumerable: true,
            };
        }
        return undefined;
    },
    ownKeys(target) {
        return target.$pluckableKeys();
    },
};

function isPluckableProperty(target: ProxyDescriptor, prop: PropertyKey) {
    return typeof prop === 'number' || typeof prop === 'string' && prop[0] !== '$' && !Reflect.has(target, prop);
}

/**
 * Extends an expression with a property access. Automatically uses bracket notation where appropriate and escapes
 * strings in brackets to give a realistic combined expression.
 *
 * @param expression the (optional) expression to extend
 * @param property the property that should be appended to the expression
 */
export function extendExpression(expression = '', property: string | number) {
    if (typeof property === 'string' && /^[a-z_][a-z_0-9]*$/i.test(property)) {
        return expression + '.' + property;
    }
    if (typeof property === 'string') {
        return expression + '["' + property.replace(/\\/g, '\\\\').replace(/\"/g, '\\"') + '"]';
    }
    return expression + '[' + property + ']';
}

/**
 * Extends a path with a property access.
 *
 * @param path the (optional) path to extend
 * @param property the property that should be appended to the path
 */
export function extendPath(path: Array<string | number> = [], property: string | number) {
    return path.concat(property);
}
