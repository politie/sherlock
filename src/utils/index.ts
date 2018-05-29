export { clone } from './clone';
export * from './equals';
export * from './mixin';
export * from './plain-object-detection';
export * from './unique-id';
export * from './unpack';

// Debug mode is implemented in the barrel file, because barrel-files don't support mutable variables.
// The syntax: `export { ... } from '...'` creates a new copy of the variable instead of linking.

export let debugMode = false;
export function setDebugMode(val: boolean) {
    debugMode = val;
}
