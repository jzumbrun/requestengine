import type { IGarage, IGear, IEngineModel, IOdometer, IRequest, IResult, IRider } from '../types.js';
/**
 * Engine
 */
export default class Engine {
    readonly request: IRequest;
    readonly odometer: IOdometer;
    readonly rider: IRider;
    readonly garage: IGarage;
    readonly gear: IGear;
    readonly model: IEngineModel;
    constructor(request: IRequest, rider: IRider, garage: IGarage, gear: IGear, odometer?: IOdometer);
    static engineCycle(request: IRequest, rider: IRider, garage: IGarage, gear: IGear, odometer?: IOdometer): Promise<IResult>;
    private cycle;
}
//# sourceMappingURL=Engine.d.ts.map