import type { IGarage, IGear, IEngineModel, IRevolution, IRequest, IResult, IOperator } from '../types.js'
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
    revolution?: IRevolution,
  ) {
    this.request = request
    this.operator = operator
    this.garage = garage
    this.gear = gear
    this.model = this.garage.engines?.find((engine) => engine.model === request.engine)
      || { model: '', ignition: [], intake: {}, exhaust: {} }
    this.revolution = revolution || {}
  }

  public static engineCycle (request: IRequest, garage: IGarage, gear: IGear, operator?: IOperator, revolution?: IRevolution): Promise<IResult> {
    const engine = new Engine(request,  garage, gear, operator, revolution)
    return engine.cycle()
  }

  private async cycle(): Promise<IResult> {
    const intake = new Intake(this)
    intake.stroke()

    let data: unknown
    if (this.model.power) {
      const power = new Power(this)
      data = await power.stroke()
      const exhaust = new Exhaust(this, data)
      return exhaust.stroke()
    } else {
      const compression = new Compression(this)
      data = await compression.stroke()
      const exhaust = new Exhaust(this, data)
      return exhaust.stroke()
    }
  }
  
}
