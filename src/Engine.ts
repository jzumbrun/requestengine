import type { IGarage, IGear, IEngineModel, IOdometer, IRequest, IResult, IRider } from '../types.js'
import Intake from './Intake.js'
import Compression from './Compression.js'
import Power from './Power.js'
import Exhaust from './Exhaust.js'

/**
 * Engine
 */
export default class Engine {
  readonly request: IRequest
  readonly odometer: IOdometer
  readonly rider: IRider
  readonly garage: IGarage
  readonly gear: IGear

  readonly model: IEngineModel

  constructor(
    request: IRequest, 
    rider: IRider,
    garage: IGarage,
    gear: IGear,
    odometer?: IOdometer
  ) {
    this.request = request
    this.rider = rider
    this.garage = garage
    this.gear = gear
    this.model = this.garage.engines?.find((engine) => engine.model === request.engine)
      || { model: '', ignition: [], intake: {}, exhaust: {} }
    this.odometer = odometer || {}
  }

  public static engineCycle (request: IRequest, rider: IRider, garage: IGarage, gear: IGear, odometer?: IOdometer): Promise<IResult> {
    const engine = new Engine(request, rider, garage, gear, odometer)
    return engine.cycle()
  }

  public async cycle(): Promise<IResult> {
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
