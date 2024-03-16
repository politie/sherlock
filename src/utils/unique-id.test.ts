import { uniqueId } from './unique-id';

describe('utils/uniqueId', () => {
    it('should always return a unique (larger) number', () => {
        let last = uniqueId();
        expect(last).toBeNumber();
        for (let i = 0; i < 100; i++) {
            const next = uniqueId();
            expect(next).toBeNumber();
            expect(next).toBeGreaterThan(last);
            last = next;
        }
    });
});
