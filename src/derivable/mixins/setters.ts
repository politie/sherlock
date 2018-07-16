import { DerivableAtom } from '../../interfaces';
import { unresolved } from '../../symbols';
import { ErrorWrapper } from '../../utils';

export function unsetMethod<V>(this: DerivableAtom<V>) {
    this.set(unresolved);
}

export function setErrorMethod<V>(this: DerivableAtom<V>, err: any) {
    this.set(new ErrorWrapper(err));
}
