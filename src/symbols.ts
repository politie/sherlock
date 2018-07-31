export const autoCacheMode = Symbol('autoCacheMode');

/**
 * Connect a derivation. It will make sure that the internal cache is kept up-to-date and all reactors are notified of changes
 * until disconnected.
 */
export const connect = Symbol('connect');

export const dependencies = Symbol('dependencies');
export const dependencyVersions = Symbol('dependencyVersions');
export const disconnect = Symbol('disconnect');
export const emptyCache = Symbol('emptyCache');
export const getState = Symbol('getState');
export const mark = Symbol('mark');
export const observers = Symbol('observers');
export const restorableState = Symbol('restorableState');
export const sherlockInstances = Symbol('sherlockInstances');
export const unresolved = Symbol('unresolved');
