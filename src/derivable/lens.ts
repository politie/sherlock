import { atomic } from '../transaction';
import { Derivation } from './derivation';
import { Derivable, SettableDerivable, StandaloneLensDescriptor, TargetedLensDescriptor } from './interfaces';
import { settablePluckMethod, swapMethod, valueGetter, valueSetter } from './mixins';
import { unpack } from './unpack';

/**
 * A Lens is a Derivation that is also settable. It satisfies the Atom interface and can be created using an
 * arbitrary get and set function or as a derivation from another Atom or Lens using a deriver (get) and
 * transform (set) function. The set function is always called inside a transaction (but will not create a new
 * transaction if one is already active) to prevent inconsistent state when an error occurs.
 */
export class Lens<V> extends Derivation<V> implements SettableDerivable<V> {
    /**
     * The setter that was provided in the constructor.
     */
    private setter: (newValue: V, ...args: any[]) => void;

    /**
     * Create a new Lens using a get and a set function. The get is used as a normal deriver function
     * including the automatic recording of dependencies, the set is used as a sink for new values.
     *
     * @param param0 the get and set functions
     */
    constructor({ get, set }: StandaloneLensDescriptor<V, any>, args?: any[]) {
        super(get, args);
        this.setter = set;
    }

    /**
     * Sets the value of this Lens, the set function provided in the constructor is responsible for maintaining
     * the state and should make sure that the next call to `get()` returns the `newValue`.
     *
     * @param newValue the new state
     */
    @atomic()
    set(newValue: V) {
        const { setter, args } = this;
        if (args) {
            setter(newValue, ...args.map(unpack));
        } else {
            setter(newValue);
        }
    }

    value!: V;
    readonly settable!: true;

    readonly lens!: SettableDerivable<V>['lens'];
    readonly pluck!: SettableDerivable<V>['pluck'];
    readonly swap!: SettableDerivable<V>['swap'];
}
Object.defineProperties(Lens.prototype, {
    value: { get: valueGetter, set: valueSetter },
    settable: { value: true },
    lens: { value: lensMethod },
    pluck: { value: settablePluckMethod },
    swap: { value: swapMethod },
});

export function lensMethod<V, W, P>(
    this: SettableDerivable<V>,
    { get, set }: TargetedLensDescriptor<V, W, P>,
    ...ps: Array<P | Derivable<P>>
): SettableDerivable<W> {

    const base = this;
    return new Lens({
        get,
        set() { base.set(set.apply(undefined, arguments)); },
    }, [base, ...ps]);
}
