import Engine from './Engine.js'
import Compression from './Compression.js'

/**
 * Power
 */
export default class Power {
  private engine: Engine

  constructor(engine: Engine) {
    this.engine = engine
  }

  public stroke (): Promise<unknown> {
    if (this.engine.model.power) {
      return this.engine.model.power(this.engine, {
        compressionFirstStroke: Compression.compressionFirstStroke,
        compressionStroke: Compression.compressionStroke,
        engineCycle: Engine.engineCycle
      });
    } else {
      return Promise.resolve();
    }
  }
  
}