interface Global {
    sherlockInstanceCount?: number;
}

declare const window: Global;
function getGlobal(): Global {
    // istanbul ignore next: it is impossible to test a window global in a Node process.
    return typeof window !== 'undefined' ? window : global as any;
}

export function runGlobalStateWarning() {
    const globalState = getGlobal();
    if (!globalState.sherlockInstanceCount) {
        globalState.sherlockInstanceCount = 1;
    } else {
        globalState.sherlockInstanceCount++;
        // tslint:disable-next-line:no-console
        console.warn(`There are ${globalState.sherlockInstanceCount} instances of Sherlock active. This could cause unexpected results.`);
    }
}
