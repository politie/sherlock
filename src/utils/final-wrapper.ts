import { equals } from './equals';

export class FinalWrapper<V> {
    static wrap<V>(value: V | FinalWrapper<V>) {
        return value instanceof FinalWrapper ? value : new FinalWrapper(value);
    }

    static unwrap<V>(value: V | FinalWrapper<V>) {
        return value instanceof FinalWrapper ? value.value : value;
    }

    private constructor(readonly value: V) { }

    equals(other: unknown) {
        return this === other ||
            other instanceof FinalWrapper && equals(this.value, other.value);
    }
}
