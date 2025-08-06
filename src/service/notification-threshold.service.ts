import { ProgramThresholdInput, ConfigItem, ThresholdConfig } from '../interfaces/notification-threshold.interface';
import thresholdConfig from '../models/notification-threshold-config.model';
import { Transaction } from 'sequelize';

export const validateThresholdInput = (body: ProgramThresholdInput[], traceId: string): { valid: boolean; message?: string } => {
    for (const moduleEntry of body) {
        const { module, config } = moduleEntry;

        if (typeof module !== 'string' || module.trim() === '') {
            return { valid: false, message: 'Each module entry must include a valid non-empty string "module"' };
        }

        if (!Array.isArray(config) || config.length === 0) {
            return { valid: false, message: `Config for module "${module}" must be a non-empty array` };
        }

        for (const configItem of config) {
            const { key, label, is_enable, threshold } = configItem;

            if (
                typeof key !== 'string' ||
                typeof label !== 'string' ||
                typeof is_enable !== 'boolean' ||
                !Array.isArray(threshold)
            ) {
                return { valid: false, message: `Invalid config structure for module "${module}"` };
            }

            for (const thresholdItem of threshold) {
                if (
                    typeof thresholdItem.supportsBeforeThresholds !== 'boolean' ||
                    typeof thresholdItem.supportsAfterThresholds !== 'boolean' ||
                    typeof thresholdItem.threshold_value !== 'number' ||
                    !['string', 'number'].includes(typeof thresholdItem.threshold_unit)
                ) {
                    return {
                        valid: false,
                        message: `Invalid threshold object in module "${module}" config key "${key}"`,
                    };
                }
            }
        }
    }

    return { valid: true };
};

export const createThresholdRecords = async (
    body: ProgramThresholdInput[],
    program_id: string,
    userId: string,
    timestamp: number,
    transaction: Transaction
): Promise<string[]> => {
    const createdIds: string[] = [];

    for (const moduleEntry of body) {
        const { module, config } = moduleEntry;

        const newThreshold = await thresholdConfig.create(
            {
                program_id,
                module,
                config,
                is_enabled: true,
                is_deleted: false,
                created_on: timestamp,
                updated_on: timestamp,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );

        createdIds.push(newThreshold.id);
    }

    return createdIds;
};
