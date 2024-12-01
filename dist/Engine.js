var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Intake from './Intake.js';
import Compression from './Compression.js';
import Power from './Power.js';
import Exhaust from './Exhaust.js';
/**
 * Engine
 */
export default class Engine {
    constructor(request, garage, gear, operator, revolution) {
        var _a;
        this.request = request;
        this.operator = operator;
        this.garage = garage;
        this.gear = gear;
        this.model = ((_a = this.garage.engines) === null || _a === void 0 ? void 0 : _a.find((engine) => engine.model === request.engine))
            || { model: '', ignition: [], intake: {}, exhaust: {} };
        this.revolution = revolution || {};
    }
    static engineCycle(request, garage, gear, operator, revolution) {
        const engine = new Engine(request, garage, gear, operator, revolution);
        return engine.cycle();
    }
    cycle() {
        return __awaiter(this, void 0, void 0, function* () {
            const intake = new Intake(this);
            intake.stroke();
            let data;
            if (this.model.power) {
                const power = new Power(this);
                data = yield power.stroke();
                const exhaust = new Exhaust(this, data);
                return exhaust.stroke();
            }
            else {
                const compression = new Compression(this);
                data = yield compression.stroke();
                const exhaust = new Exhaust(this, data);
                return exhaust.stroke();
            }
        });
    }
}
