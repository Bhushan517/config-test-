
import RateGuidanceConfig from '../models/rate-guidance-config.model';

 class RateGuidanceConfigRepository {
async createOrUpdate(program_id: string, is_enabled: boolean) {
    const [updated] = await RateGuidanceConfig.update(
      { is_enable: is_enabled, updated_on: Date.now() },
      { where: { program_id } }
    );

    if (updated === 0) {
      return await RateGuidanceConfig.create({
        program_id,
        is_enable: is_enabled,
        created_on: Date.now(),
        updated_on: Date.now()
      });
    }

    return await RateGuidanceConfig.findOne({ where: { program_id } });
  }
async findById(id: string) {
  return await RateGuidanceConfig.findOne({
    where: { id },
    attributes: ['id', 'program_id', 'is_enable']
  });
}


async findByProgramId(program_id: string) {
  return await RateGuidanceConfig.findOne({
    where: { program_id },
    attributes: ['id', 'program_id', 'is_enable']
  });
}

}
export default RateGuidanceConfigRepository;