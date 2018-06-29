import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import { runGlobalStateWarning } from './multiple-instances-warning';

describe('util/multiple-instances-warning', () => {
    let consoleWarnStub: SinonStub;

    beforeEach('reset global', () => resetGlobal());

    beforeEach('stub console.warn', () => { consoleWarnStub = stub(console, 'warn'); });
    afterEach('restore console.warn', () => { consoleWarnStub.restore(); });

    it('should add sherlockInstanceCount to global object', () => {
        runGlobalStateWarning();
        expect(getInstanceCount()).to.equal(1);
        expect(consoleWarnStub).not.to.have.been.called;
    });

    it('should call console.warn when more than one instance of sherlock is loaded', () => {
        runGlobalStateWarning();
        runGlobalStateWarning();
        expect(getInstanceCount()).to.equal(2);
        expect(consoleWarnStub)
            .to.have.been.calledWith('There are 2 instances of Sherlock active. This could cause unexpected results.');
    });
});

function getInstanceCount() {
    return (global as any).sherlockInstanceCount;
}

function resetGlobal() {
    delete (global as any).sherlockInstanceCount;
}
