import { LensDescriptor, SettableDerivable } from '../interfaces';
import { atomic } from '../transaction';
import { augmentStack } from '../utils';
import { Derivation } from './derivation';
import { safeUnwrap } from './unwrap';

/**
 * A Lens is a Derivation that is also settable. It satisfies the Atom interface and can be created using an
 * arbitrary get and set function or as a derivation from another Atom or Lens using a deriver (get) and
 * transform (set) function. The set function is always called inside a transaction (but will not create a new
 * transaction if one is already active) to prevent inconsistent state when an error occurs.
 */
export class Lens<V> extends Derivation<V> implements SettableDerivable<V> {
    /**
     * The setter that was provided in the constructor.
     * @internal
     */
    private _setter: (newValue: V, ...args: any[]) => void;

    /**
     * Create a new Lens using a get and a set function. The get is used as a normal deriver function
     * including the automatic recording of dependencies, the set is used as a sink for new values.
     *
     * @param param0 the get and set functions
     */
    constructor({ get, set }: LensDescriptor<V, any>, args?: any[]) {
        super(get, args);
        this._setter = set;
    }

    /**
     * Sets the value of this Lens, the set function provided in the constructor is responsible for maintaining
     * the state and should make sure that the next call to `get()` returns the `newValue`.
     *
     * @param newValue the new state
     */
    @atomic()
    set(newValue: V) {
        if (this.finalized) {
            throw augmentStack(new Error('cannot set a final derivable'), this);
        }
        if (this._args) {
            this._setter(newValue, ...this._args.map(safeUnwrap));
        } else {
            this._setter(newValue);
        }
    }
}
