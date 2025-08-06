
import RateGuidance from '../models/rate-guidance.model';
 class RateGuidanceRepository {
async createOrUpdateEvents(rate_guidance_id: string, rate_guidance: Array<{ event_name: string, is_enabled: boolean }>, isUpdate: boolean = false) {
    const result = [];
    for (const event of rate_guidance) {
        if (isUpdate) {
            console.log('Update mode - searching for event:', event.event_name); // Debug
            
            const existingEvent = await RateGuidance.findOne({
                where: { 
                    rate_guidance_id,
                    event: event.event_name 
                }
            });
            
            
            if (existingEvent) {
                await RateGuidance.update(
                    { is_enabled: event.is_enabled },
                    { where: { 
                        rate_guidance_id,
                        event: event.event_name 
                    }}
                );
                
                const updatedRecord = await RateGuidance.findOne({
                    where: { rate_guidance_id, event: event.event_name }
                });
                result.push(updatedRecord);
            }
        } else {
            const [record, created] = await RateGuidance.upsert({
                rate_guidance_id,
                event: event.event_name,
                is_enabled: event.is_enabled
            }, { returning: true });
            result.push(record);
        }
    }
    
    return result;
}
async findEventsByRateGuidanceId(rate_guidance_id: string) {
  return await RateGuidance.findAll({
    where: { rate_guidance_id },
    attributes: ['id','rate_guidance_id', 'event', 'is_enabled']
  });

  
}


}
export default RateGuidanceRepository;