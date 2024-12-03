import type { IGarage, IGear, IEngineModel, IRevolution, IRequest, IResult, IOperator, IIntakeValves } from '../types.js'
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
  intakeValves!: IIntakeValves
  exhaustValves: unknown

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

  private liftIntakeValves(): void {
    const intake = this.request.fuel
    const operator = this.operator
    const revolution = this.revolution
    const model = this.model
    this.intakeValves = {
      intake, operator, revolution, model,
      i: intake, o: operator, r: revolution, m: model
    }
  }

  private async cycle(): Promise<IResult> {
    const intake = new Intake(this)
    intake.stroke()

    this.liftIntakeValves()

    if (this.model.power) {
      const power = new Power(this)
      this.exhaustValves = await power.stroke()
      const exhaust = new Exhaust(this, this.exhaustValves)
      return exhaust.stroke()
    } else {
      const compression = new Compression(this)
      this.exhaustValves = await compression.stroke()
      const exhaust = new Exhaust(this, this.exhaustValves)
      return exhaust.stroke()
    }
  }
  
}
