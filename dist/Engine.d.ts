import type { IGarage, IGear, IEngineModel, IRevolution, IRequest, IResult, IOperator, IIntakeValves } from './types.js';
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
    intakeValves: IIntakeValves;
    exhaustValves: unknown;
    constructor(request: IRequest, garage: IGarage, gear: IGear, operator?: IOperator, revolution?: IRevolution);
    static engineCycle(request: IRequest, garage: IGarage, gear: IGear, operator?: IOperator, revolution?: IRevolution): Promise<IResult>;
    private liftIntakeValves;
    private cycle;
}
//# sourceMappingURL=Engine.d.ts.map