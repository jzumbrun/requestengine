import type { ITuning, IRider, IRequest, IResponse, IHTTPRequest, IHTTPResponse } from '../types.d.js';
export type * from '../types.d.ts';
export default class RequestEngine {
    readonly tuning: ITuning;
    constructor(tuning?: ITuning);
    /**
     * Start
     */
    start(): void;
    /**
     * Request middleware
     */
    middleware(): (req: IHTTPRequest, res: IHTTPResponse) => Promise<void>;
    /**
     * Execute queries
     */
    run(requests: IRequest[], rider: IRider): Promise<IResponse>;
}
/**
 * Start
 */
export declare function kickStart(tuning: ITuning): RequestEngine;
//# sourceMappingURL=index.d.ts.map