import { testDerivable } from './derivable.spec';
import { constant } from './factories';

describe('derivable/constant', () => {
    testDerivable(constant);
});
