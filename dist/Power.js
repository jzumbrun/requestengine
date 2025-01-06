import Engine from './Engine.js';
import Compression from './Compression.js';
/**
 * Power
 */
export default class Power {
    constructor(engine) {
        this.engine = engine;
    }
    stroke() {
        if (this.engine.model.power) {
            return this.engine.model.power(this.engine, {
                compressionStroke: Compression.compressionStroke,
                engineCycle: Engine.engineCycle,
            });
        }
        else {
            return Promise.resolve();
        }
    }
}
