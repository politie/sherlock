import { sherlockInstances } from '../symbols';

export function runGlobalStateWarning() {
    // istanbul ignore next: it is impossible to test a window global in a Node process.
    const globalState = typeof window !== 'undefined' ? window : global;
    if (!globalState[sherlockInstances]) {
        globalState[sherlockInstances] = 1;
    } else {
        globalState[sherlockInstances]++;
        // tslint:disable-next-line:no-console
        console.warn(`${globalState[sherlockInstances]} instances of Sherlock detected. This could cause unexpected results.`);
    }
}
