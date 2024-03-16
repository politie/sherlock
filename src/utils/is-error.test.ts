import { isError } from './is-error';

describe('utils/is-error', () => {
    describe('.isError', () => {
        it('accepts an object with strings as name, message, and optionally stack', () => {
            [
                { name: 'valid', message: 'object' },
                { name: 'another', message: 'valid', stack: 'object' },
                { name: 'valid', message: 'object', with: 3, properties: ['extra', 'is'], allowed: true }
            ].forEach(testCase => expect(isError(testCase)).toBeTrue());
        });

        it('rejects an object with missing or wrong type properties', () => {
            [
                { name: 'invalid object', without: 'message' },
                { message: 'invalid object', without: 'name' },
                { message: 'invalid object with', name: ['of', 'wrong', 'type'] },
                { name: 'invalid object with', message: false },
                { name: 'invalid object', message: 'with wrong type for', stack: 42 },
            ].forEach(testCase => expect(isError(testCase)).toBeFalse());
        });

        it('rejects non-object input', () => {
            [
                true,
                false,
                undefined,
                null,
                42,
                'resistance is futile',
                ['just', 1, true, 'array'],
            ].forEach(testCase => expect(isError(testCase)).toBeFalse());
        });
    });
});
