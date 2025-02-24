import type {
  IGarage,
  IGear,
  IEngineModel,
  IRevolution,
  IResponse,
  IRequest,
  IOperator,
} from './types.js'
import Intake from './Intake.js'
import Compression from './Compression.js'
import Power from './Power.js'
import Exhaust from './Exhaust.js'

/**
 * Engine
 */
export default class Engine {
  readonly request: IRequest
  readonly revolution: IRevolution
  readonly operator?: IOperator
  readonly garage: IGarage
  readonly gear: IGear

  readonly model: IEngineModel

  constructor(
    request: IRequest,
    garage: IGarage,
    gear: IGear,
    operator?: IOperator,
    revolution?: IRevolution
  ) {
    this.request = request
    this.operator = operator
    this.garage = garage
    this.gear = gear
    this.model = this.garage.engines?.find(
      (engine) => engine.model === request.engine
    ) || { model: '', ignition: [], intake: {}, exhaust: {} }
    this.revolution = revolution || {}
  }

  public static engineCycle(
    request: IRequest,
    garage: IGarage,
    gear: IGear,
    operator?: IOperator,
    revolution?: IRevolution
  ): Promise<IResponse> {
    const engine = new Engine(request, garage, gear, operator, revolution)
    return engine.cycle()
  }

  private async cycle(): Promise<IResponse> {
    const intake = new Intake(this)
    intake.stroke()

    if (this.model.power) {
      const power = new Power(this)
      const exhaust = new Exhaust(this, await power.stroke())
      return exhaust.stroke()
    } else {
      const compression = new Compression(this)
      const exhaust = new Exhaust(this, await compression.stroke())
      return exhaust.stroke()
    }
  }
}
