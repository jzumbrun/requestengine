import type { IRequestModel } from '../../types.d.ts';
import EngineError from './EngineError.js';
export default class RequestError extends EngineError {
    request: IRequestModel;
    constructor(request: IRequestModel, errno: number, code: string, details?: any);
}
//# sourceMappingURL=RequestError.d.ts.map