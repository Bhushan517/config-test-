import { Model } from 'sequelize';

export const beforeSave = (record: Model) => {
    if (record.isNewRecord) {
        record.set('created_on', Date.now());
        record.set('updated_on', Date.now());
    } else {
        record.set('updated_on', Date.now());
    }
    
  // const ruleDuration = record.get('rule_duration');
  // if (ruleDuration && typeof ruleDuration === 'string') {
  //   const capitalized = ruleDuration
  //     .split('-')
  //     .map(word => word.charAt(0).toLowerCase() + word.slice(1).toLowerCase())
  //     .join('-');
  //   record.set('rule_duration', capitalized);
  // }

};