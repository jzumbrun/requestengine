import type { IOperator, IRequest, IResponse, IHTTPRequest, IHTTPResponse, IEngineModel, IGarage, IGear } from '../types.d.js';
export * as Start from './Start.js';
export * as Engine from './Engine.js';
export * as Intake from './Intake.js';
export * as Compression from './Compression.js';
export * as Power from './Power.js';
export * as Exhaust from './Exhaust.js';
export * from './errors/index.js';
export type * from '../types.d.ts';
export default class RequestEngine {
    readonly garage: IGarage;
    readonly gear: IGear;
    constructor(garage: IGarage, gear: IGear);
    /**
     * Start
     */
    start(): void;
    /**
     * Request middleware
     */
    middleware(): (req: IHTTPRequest, res: IHTTPResponse) => Promise<void>;
    /**
     * Execute requests
     */
    run(requests: IRequest[], operator?: IOperator): Promise<IResponse>;
    /**
     * Get Engine Schemas
     */
    getEngineSchemas(): Pick<IEngineModel, "model" | "intake" | "exhaust">[];
}
/**
 * Start
 */
export declare function kickStart(garage: IGarage, gear: IGear): RequestEngine;
//# sourceMappingURL=index.d.ts.map