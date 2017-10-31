import { expect } from 'chai';
import { uniqueId } from './unique-id';

describe('utils/uniqueId', () => {
    it('should always return a unique (larger) number', () => {
        let last = uniqueId();
        expect(last).to.be.a('number');
        for (let i = 0; i < 100; i++) {
            const next = uniqueId();
            expect(next).to.be.a('number');
            expect(next).to.be.above(last);
            last = next;
        }
    });
});
