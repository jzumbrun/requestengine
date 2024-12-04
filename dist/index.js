var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Engine from './Engine.js';
import Start from './Start.js';
export * as Start from './Start.js';
export * as Engine from './Engine.js';
export * as Intake from './Intake.js';
export * as Compression from './Compression.js';
export * as Power from './Power.js';
export * as Exhaust from './Exhaust.js';
export * from './errors/index.js';
export default class RequestEngine {
    constructor(garage, gear) {
        garage.env = process.env.NODE_ENV || 'production';
        gear.neutral = gear.neutral || undefined;
        this.garage = garage;
        this.gear = gear;
    }
    /**
     * Start
     */
    start() {
        const start = new Start(this.garage, this.gear);
        start.turnOver();
    }
    /**
     * Request middleware
     */
    middleware() {
        return (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const response = yield this.run(((_a = req.body) === null || _a === void 0 ? void 0 : _a.requests) || [], req.operator);
            res.send(response);
        });
    }
    /**
     * Execute requests
     */
    run(requests, operator) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = { requests: [] };
            const timing = [];
            const revolution = {};
            try {
                for (const request of requests) {
                    const engineCyle = Engine.engineCycle(request, this.garage, this.gear, operator, revolution);
                    if (request.timing === false)
                        timing.push(engineCyle);
                    else
                        response.requests.push(yield engineCyle);
                }
                // Process all of the async queries here
                // The catch was defined above in the creation of the promise
                if (timing.length)
                    response.requests.push(...yield Promise.all(timing));
            }
            catch (error) {
                error.details = error.details || error.message;
                response.requests.push({ error });
            }
            finally {
                if (typeof this.gear.neutral === 'function')
                    this.gear.neutral(response);
            }
            return response;
        });
    }
    /**
     * Get Engine Schemas
     */
    getEngineSchemas() {
        return this.garage.engines.map(engine => ({ model: engine.model, intake: engine.intake, exhaust: engine.exhaust }));
    }
}
/**
 * Start
 */
export function kickStart(garage, gear) {
    const engine = new RequestEngine(garage, gear);
    engine.start();
    return engine;
}
