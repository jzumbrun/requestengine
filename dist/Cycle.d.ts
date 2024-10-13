import type { ITuning, IEngine, IHistory, IRequest, IResponse, IRider } from '../types.js';
/**
 * Cycle
 */
export default class Cycle {
    readonly request: IRequest;
    readonly response: IResponse;
    readonly history: IHistory;
    readonly async: Promise<void>[];
    readonly rider: IRider;
    readonly tuning: ITuning;
    readonly engine: IEngine;
    constructor(request: IRequest, response: IResponse, history: IHistory, async: Promise<void>[], rider: IRider, tuning: ITuning);
    stroke(): Promise<void>;
    /**
    * Cycle Error
    */
    private cycleError;
}
//# sourceMappingURL=Cycle.d.ts.map