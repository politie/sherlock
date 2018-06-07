
export interface ExtendDerivable<V> { }

declare module './derivable.interface' {
    export interface Derivable<V> extends ExtendDerivable<V> { }
}
declare module './derivable' {
    export interface BaseDerivable<V> extends ExtendDerivable<V> { }
}
