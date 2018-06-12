
/**
 * This interface can be used to augment all Derivables.
 *
 * The augmentation added to this interface will be added to both the BaseDerivable class interface
 * and the Derivable interface keeping those in sync automatically.
 *
 * The implementation has to be added to the BaseDerivable class.
 */
export interface DerivableExtension<V> { }

declare module './derivable.interface' {
    export interface Derivable<V> extends DerivableExtension<V> { }
}
declare module './base-derivable' {
    export interface BaseDerivable<V> extends DerivableExtension<V> { }
}
