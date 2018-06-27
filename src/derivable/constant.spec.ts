import { unresolved } from '../symbols';
import { ErrorWrapper } from '../utils';
import { testDerivable } from './base-derivable.spec';
import { constant } from './factories';

describe('derivable/constant', () => {
    testDerivable(v => v === unresolved ? constant.unresolved() : v instanceof ErrorWrapper ? constant.error(v.error) : constant(v), true);
});
