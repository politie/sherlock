import { sherlockInstances } from '../symbols';
import { runGlobalStateWarning } from './multiple-instances-warning';

describe('util/multiple-instances-warning', () => {
    let consoleWarnStub: jest.SpyInstance;

    beforeEach(() => { delete global[sherlockInstances]; });

    beforeEach(() => { consoleWarnStub = jest.spyOn(console, 'warn').mockReturnValue(); });

    it('should add sherlockInstanceCount to global object', () => {
        runGlobalStateWarning();
        expect(global[sherlockInstances]).toBe(1);
        expect(consoleWarnStub).not.toHaveBeenCalled;
    });

    it('should call console.warn when more than one instance of sherlock is loaded', () => {
        runGlobalStateWarning();
        runGlobalStateWarning();
        expect(global[sherlockInstances]).toBe(2);
        expect(consoleWarnStub).toHaveBeenCalledWith('2 instances of Sherlock detected. This could cause unexpected results.');
    });
});
