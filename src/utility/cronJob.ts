import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import cron from 'node-cron';
import { Op } from "sequelize";
export function runVendorDocExpiryJob() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayTimestamp = startOfToday.getTime();

      const expiryDateTimestamp = new Date();
      expiryDateTimestamp.setHours(0, 0, 0, 0);
      const expiryStartOfDay = expiryDateTimestamp.getTime();

      await VendorComplianceReqDocMappingModel.update(
        { status: 'Expired', expiry_on: expiryStartOfDay },
        {
          where: {
            expiry_on: {
              [Op.lt]: todayTimestamp,
            },
            status: {
              [Op.ne]: 'Expired',
            },
          },
        }
      );

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);
      const twoDaysAgoTimestamp = twoDaysAgo.getTime();

      await VendorComplianceReqDocMappingModel.update(
        { status: 'Expired', expiry_on: expiryStartOfDay },
        {
          where: {
            status: 'Pending Upload',
            updated_on: {
              [Op.lt]: twoDaysAgoTimestamp,
            },
          },
        }
      );

      console.log('[CronJob] Expired vendor documents updated successfully.');
    } catch (error) {
      console.error('[CronJob] Error updating expired vendor documents:', error);
    }
  });
}