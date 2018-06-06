import { atomic } from '../transaction';
import { unpack } from '../utils';
import { Derivable, SettableDerivable } from './derivable';
import { Derivation } from './derivation';
import { LensDescriptor, LensFn, MonoLensDescriptor } from './lens.interface';
import { addValueAccessors } from './mixins/accessors';
import { AtomPluck, Swap } from './mixins/interfaces';
import { pluck } from './mixins/pluck';
import { swap } from './mixins/swap';

/**
 * A Lens is a Derivation that is also settable. It satisfies the Atom interface and can be created using an
 * arbitrary get and set function or as a derivation from another Atom or Lens using a deriver (get) and
 * transform (set) function. The set function is always called inside a transaction (but will not create a new
 * transaction if one is already active) to prevent inconsistent state when an error occurs.
 */
export class Lens<V> extends Derivation<V> implements SettableDerivable<V> {
    /**
     * A Lens is settable
     */
    readonly settable = true;

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
    constructor({ get, set }: LensDescriptor<V, any>, args?: any[]) {
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
    lens!: LensFn<V>;
    pluck!: AtomPluck<V>;
    swap!: Swap<V>;
}
addValueAccessors(Lens.prototype);
Lens.prototype.lens = lensMethod;
Lens.prototype.pluck = pluck as AtomPluck<any>;
Lens.prototype.swap = swap;

export function lensMethod<V, W, P>(
    this: SettableDerivable<V>, { get, set }: MonoLensDescriptor<V, W, P>,
    ...ps: Array<P | Derivable<P>>,
): SettableDerivable<W> {

    const atom = this;
    return new Lens({
        get,
        set() { atom.set(set.apply(undefined, arguments)); },
    }, [atom, ...ps]);
}
