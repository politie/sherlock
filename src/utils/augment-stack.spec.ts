import { expect } from 'chai';
import { augmentStack, prepareCreationStack } from './augment-stack';
import { config } from './config';

describe('utils/augment-stack', () => {
    describe('augmentStack', () => {
        it('should do nothing when no creationStack is present', () => {
            const originalError = new Error();
            const originalStack = originalError.stack;
            const returnedError = augmentStack(originalError, {});
            expect(returnedError).to.equal(originalError);
            expect(returnedError.stack).to.equal(originalStack);
        });

        it('should augment the provided error when a creationStack is present', () => {
            const obj = { creationStack: 'this is the creation stack' };
            const originalError = new Error('this is my message');
            const originalStack = originalError.stack;
            const returnedError = augmentStack(originalError, obj);
            expect(returnedError).to.not.equal(originalError);
            expect(originalError.stack).to.equal(originalStack);
            expect(returnedError.stack).to.equal(originalStack + '\n' + obj.creationStack);
        });
    });

    describe('prepareCreationStack', () => {
        it('should return undefined when config.debugMode = false', () => {
            expect(prepareCreationStack({})).to.be.undefined;
        });

        context('(in debug mode)', () => {
            before('enable debug mode', () => { config.debugMode = true; });
            after('disable debug mode', () => { config.debugMode = false; });

            it('should return a string with the creation stack', () => {
                class MyClass { }
                const result = prepareCreationStack(new MyClass);
                expect(result).to.match(/^MyClass created:\n\s*at.*prepareCreationStack.*\n/);
            });
        });
    });
});
