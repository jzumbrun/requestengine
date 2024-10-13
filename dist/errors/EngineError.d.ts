export default class EngineError extends Error {
    errno: number;
    code: string;
    details?: any;
    constructor(errno: number, code: string, details?: any);
}
//# sourceMappingURL=EngineError.d.ts.map