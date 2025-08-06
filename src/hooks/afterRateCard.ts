
import IndustriesModel from '../models/labour-category.model';
import RateCard from '../models/rate-card.model';

export const industriesHooks = {
 
  afterCreate: async (instance: IndustriesModel) => {
    try {
      await RateCard.create({
        labor_category_id: instance.id,
        program_id: instance.program_id,
        is_enabled: instance.is_enabled,
      });
    } catch (error) {
      console.error('Error creating RateCard after labor category creation:', error);
    }
  },
};