import { State } from '../interfaces';
import { clone } from './clone';
import { config } from './config';
import { ErrorWrapper } from './error-wrapper';

export interface ObjectWithCreationStack { creationStack?: string; }

export function augmentStack(err: Error, obj: ObjectWithCreationStack) {
    const { creationStack } = obj;
    if (!creationStack) {
        return err;
    }
    return Object.defineProperty(clone(err), 'stack', {
        value: `${err.stack}\n${creationStack}`,
    });
}

export function augmentState<V>(state: State<V>, obj: ObjectWithCreationStack) {
    if (obj.creationStack && state instanceof ErrorWrapper) {
        return new ErrorWrapper(augmentStack(state.error, obj));
    }
    return state;
}

export function prepareCreationStack(obj: object) {
    if (config.debugMode) {
        const stack = new Error().stack;
        return `${obj.constructor.name} created:\n${stack && stack.substr(stack.indexOf('\n') + 1)}`;
    }
    return;
}
