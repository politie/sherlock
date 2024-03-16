import { isPlainObject } from './plain-object-detection';

describe('utils/plain-object-detection', () => {
    describe('.isPlainObject', () => {
        ([
            ['new class MyClass { }', false],
            ['({})', true],
            ['new Object', true],
            ['Object.create(null)', true],
            ['Object.create({})', true],
            ['Math // Known limitation of algorithm', true],
            ['5', false],
            ['"asdf"', false],
            ['new Date', false],
        ] as Array<[any, boolean]>
        ).forEach(([input, result]) => {
            it(`should report ${result} on the result of '${input}'`, () => {
                // tslint:disable-next-line:no-eval
                expect(isPlainObject(eval(input))).toBe(result);
            });
        });
    });
});
