import type { IGarage, IGear, IEngineModel, IRevolution, IRequest, IResult, IOperator } from '../types.js';
/**
 * Engine
 */
export default class Engine {
    readonly request: IRequest;
    readonly revolution: IRevolution;
    readonly operator?: IOperator;
    readonly garage: IGarage;
    readonly gear: IGear;
    readonly model: IEngineModel;
    constructor(request: IRequest, garage: IGarage, gear: IGear, operator?: IOperator, revolution?: IRevolution);
    static engineCycle(request: IRequest, garage: IGarage, gear: IGear, operator?: IOperator, revolution?: IRevolution): Promise<IResult>;
    private cycle;
}
//# sourceMappingURL=Engine.d.ts.map