import { augmentStack, prepareCreationStack } from './augment-stack';
import { config } from './config';

describe('utils/augment-stack', () => {
    describe('augmentStack', () => {
        it('should do nothing when no creationStack is present', () => {
            const originalError = new Error();
            const originalStack = originalError.stack;
            const returnedError = augmentStack(originalError, {});
            expect(returnedError).toBe(originalError);
            expect(returnedError.stack).toBe(originalStack);
        });

        it('should augment the provided error when a creationStack is present', () => {
            const obj = { creationStack: 'this is the creation stack' };
            const originalError = new Error('this is my message');
            const originalStack = originalError.stack;
            const returnedError = augmentStack(originalError, obj);
            expect(returnedError).not.toBe(originalError);
            expect(originalError.stack).toBe(originalStack);
            expect(returnedError.stack).toBe(originalStack + '\n' + obj.creationStack);
        });
    });

    describe('prepareCreationStack', () => {
        it('should return undefined when config.debugMode = false', () => {
            expect(prepareCreationStack({})).toBeUndefined();
        });

        describe('(in debug mode)', () => {
            beforeAll(() => { config.debugMode = true; });
            afterAll(() => { config.debugMode = false; });

            it('should return a string with the creation stack', () => {
                class MyClass { }
                const result = prepareCreationStack(new MyClass);
                expect(result).toMatch(/^MyClass created:\n\s*at.*prepareCreationStack.*\n/);
            });
        });
    });
});
