
import  RateGuidanceConfigRepository  from '../repositories/rate-guidance-config.repository';
import { RateGuidanceConfigPayload } from '../interfaces/rate-guidance-config.interface';

export class RateGuidanceConfigService {
    private repository = new RateGuidanceConfigRepository();

    async createOrUpdate(payload: RateGuidanceConfigPayload) {
        const { program_id, is_enabled } = payload;
        return await this.repository.createOrUpdate(program_id, is_enabled);
    }
}





