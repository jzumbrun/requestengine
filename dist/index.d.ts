import type { IOperator, IRequest, IResponse, IHTTPRequest, IHTTPResponse, IEngineModel, IGarage, IGear } from './types.js';
export { default as Start } from './Start.js';
export { default as Engine } from './Engine.js';
export { default as Intake } from './Intake.js';
export { default as Compression } from './Compression.js';
export { default as Power } from './Power.js';
export { default as Exhaust } from './Exhaust.js';
export * from './errors/index.js';
export type * from './types.js';
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
    run(requests: IRequest[], operator?: IOperator): Promise<IResponse[]>;
    /**
     * Get Engine Schemas
     */
    getEngineSchemas(): Pick<IEngineModel, 'model' | 'intake' | 'exhaust'>[];
}
/**
 * Start
 */
export declare function kickStart(garage: IGarage, gear: IGear): RequestEngine;
//# sourceMappingURL=index.d.ts.map