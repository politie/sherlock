import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import { sherlockInstances } from 'symbols';
import { runGlobalStateWarning } from './multiple-instances-warning';

describe('util/multiple-instances-warning', () => {
    let consoleWarnStub: SinonStub;

    beforeEach('reset global', () => { delete global[sherlockInstances]; });

    beforeEach('stub console.warn', () => { consoleWarnStub = stub(console, 'warn'); });
    afterEach('restore console.warn', () => { consoleWarnStub.restore(); });

    it('should add sherlockInstanceCount to global object', () => {
        runGlobalStateWarning();
        expect(global[sherlockInstances]).to.equal(1);
        expect(consoleWarnStub).not.to.have.been.called;
    });

    it('should call console.warn when more than one instance of sherlock is loaded', () => {
        runGlobalStateWarning();
        runGlobalStateWarning();
        expect(global[sherlockInstances]).to.equal(2);
        expect(consoleWarnStub)
            .to.have.been.calledWith('2 instances of Sherlock detected. This could cause unexpected results.');
    });
});
