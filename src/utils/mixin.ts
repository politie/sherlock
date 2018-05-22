export function MixinFn(fn: (...args: any[]) => any): PropertyDecorator {
    return (prot, name) => {
        prot[name] = fn;
    };
}

export function MixinProp(obj: any, prop?: string): PropertyDecorator {
    return (prot, name) => {
        Object.defineProperty(prot, name, Object.getOwnPropertyDescriptor(obj, prop || name)!);
    };
}
