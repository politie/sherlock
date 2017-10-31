declare module 'chai-immutable' {
    function chaiImmutable(chai: any, utils: any): void;
    namespace chaiImmutable { }
    export = chaiImmutable;
}

declare namespace Chai {
    export interface Assertion {
        size(nr: number): this;
        sizeOf(nr: number): this;
    }
}
