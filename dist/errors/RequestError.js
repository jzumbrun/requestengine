import EngineError from './EngineError.js';
export default class RequestError extends EngineError {
    constructor(request, errno, code, details) {
        super(errno, code, details);
        this.request = request;
    }
}
