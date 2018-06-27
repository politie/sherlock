import { SettableDerivable } from '../../interfaces';
import { safeUnwrap } from '../unwrap';

export function swapMethod<V>(this: SettableDerivable<V>, f: (oldValue: V | undefined, ...args: any[]) => V, ...args: any[]) {
    this.set(f(this.value, ...args.map(safeUnwrap)));
}
