
/**
 * This interface can be used to augment all Derivables.
 *
 * The augmentation added to this interface will be added to the BaseDerivable class
 * and the Derivable interface.
 *
 * It is important to also add this to the BaseDerivable class!
 */
export interface ExtendDerivable<V> { }

declare module './derivable.interface' {
    export interface Derivable<V> extends ExtendDerivable<V> { }
}
declare module './derivable' {
    export interface BaseDerivable<V> extends ExtendDerivable<V> { }
}
