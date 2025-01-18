import type {
  IOperator,
  IRevolution,
  IRequest,
  IResponse,
  IHTTPRequest,
  IHTTPResponse,
  IEngineModel,
  IGarage,
  IGear,
} from './types.js'
import Engine from './Engine.js'
import Start from './Start.js'

export { default as Start } from './Start.js'
export { default as Engine } from './Engine.js'
export { default as Intake } from './Intake.js'
export { default as Compression } from './Compression.js'
export { default as Power } from './Power.js'
export { default as Exhaust } from './Exhaust.js'
export * from './errors/index.js'
export type * from './types.js'

export default class RequestEngine {
  readonly garage: IGarage
  readonly gear: IGear

  constructor(garage: IGarage, gear: IGear) {
    garage.env = process.env.NODE_ENV || 'production'
    gear.neutral = gear.neutral || undefined
    this.garage = garage
    this.gear = gear
  }

  /**
   * Start
   */
  public start(): void {
    const start = new Start(this.garage, this.gear)
    start.turnOver()
  }

  /**
   * Request middleware
   */
  public middleware() {
    return async (req: IHTTPRequest, res: IHTTPResponse) => {
      const response = await this.run(req.body || [], req.operator)
      res.send(response)
    }
  }

  /**
   * Execute requests
   */
  public async run(
    requests: IRequest[],
    operator?: IOperator
  ): Promise<IResponse[]> {
    const response: IResponse[] = []
    const timing: Promise<IResponse>[] = []
    const revolution: IRevolution = {}

    try {
      for (const request of requests) {
        const engineCyle = Engine.engineCycle(
          request,
          this.garage,
          this.gear,
          operator,
          revolution
        )

        if (request.timing === false) {
          timing.push(engineCyle)
        } else {
          response.push(await engineCyle)
        }
      }

      // Process all of the async queries here
      // The catch was defined above in the creation of the promise
      if (timing.length) response.push(...(await Promise.all(timing)))
    } catch (error: any) {
      error.details = error.details || error.message
      response.push({
        engine: error?.request?.engine,
        serial: error?.request?.serial,
        error,
      })
    } finally {
      if (typeof this.gear.neutral === 'function') this.gear.neutral(response)
    }

    return response
  }

  /**
   * Get Engine Schemas
   */
  public getEngineSchemas(): Pick<
    IEngineModel,
    'model' | 'intake' | 'exhaust'
  >[] {
    return this.garage.engines.map((engine) => ({
      model: engine.model,
      intake: engine.intake,
      exhaust: engine.exhaust,
    }))
  }
}

/**
 * Start
 */
export function kickStart(garage: IGarage, gear: IGear): RequestEngine {
  const engine = new RequestEngine(garage, gear)
  engine.start()
  return engine
}
