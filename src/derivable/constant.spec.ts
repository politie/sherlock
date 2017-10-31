import { constant } from './constant';
import { testDerivable } from './derivable.spec';

describe('derivable/constant', () => {
    testDerivable(constant);
});
