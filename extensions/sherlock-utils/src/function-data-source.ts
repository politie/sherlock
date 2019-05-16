import { PullDataSource } from '@politie/sherlock';

/**
 * Lazy PullDataSource that is based on a plain javascript function that has to supply the value when someone subscribes to this
 * datasource.
 */
export class FunctionDataSource<T> extends PullDataSource<T> {

    // istanbul ignore next: transpiled code for constructor cannot be fully covered
    constructor(private readonly fn: () => T) {
        super();
    }

    /**
     * Required function that calculates the current value for this datasource. Will be called once everytime
     * `get()` is called when not connected. When connected, it will be called once and then only whenever `checkForChanges()`
     * was called.
     */
    calculateCurrentValue() {
        return this.fn();
    }

    /**
     * Update the currently cached value of this datasource (only when connected) and notify observers when neccessary.
     */
    changed() {
        super.checkForChanges();
    }
}
