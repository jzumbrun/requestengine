export default class EngineError extends Error {
    constructor(errno, code, details) {
        super(code);
        this.errno = errno;
        this.code = code;
        this.details = details;
    }
}
