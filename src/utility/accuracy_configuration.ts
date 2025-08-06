import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";

class AccuracyConfiguration {
    static async accuracyConfiguration(program_id: string, config_model: string): Promise<any[]> {
        try {
            const query = `
                SELECT 
                    id,
                    program_id,
                    config_model,
                    title,
                    description,
                    \`key\`,
                    data_type,
                    \`value\`,
                    configuration_id
                FROM programs_config
                WHERE program_id = :program_id AND title = :config_model
            `;

            const replacements = { program_id, config_model };

            const result = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            if (!result.length) {
                return [];
            }

            return result as any[];
        } catch (error) {
            console.error("Error fetching configuration:", error);
            throw new Error("Failed to fetch accuracy configuration");
        }
    }

    static findAndCalculate(configData: any[], title: string, amount: number): string {
        if (!Array.isArray(configData)) {
            console.error("Error: configData is not an array or is undefined");
            return amount.toString();
        }
        if (amount === null || amount === undefined || isNaN(amount)) {
            console.log("Invalid amount provided (null, undefined, or NaN):", amount);
            return "0";
        }
        amount = Number(amount);
        if (!Number.isFinite(amount)) {
            console.log("Invalid amount provided (Not Finite):", amount);
            return amount.toString();
        }

        const accuracyConfigRecord = configData.find(
            (item) =>
                item.title === "Accuracy Configuration" &&
                item.config_model === "platform"
        );
        const isAccuracyEnabled = accuracyConfigRecord?.value == true;

        const amountObject = configData
            .find((item) => item.config_model === "accuracy_configuration")
            ?.value.find((val: { title: string }) => val.title === title);

        if (!amountObject || !Array.isArray(amountObject.fields)) {
            console.warn("Warning: 'Amount' configuration not found or has no fields");
            return amount.toString();
        }

        const allFields = amountObject.fields.flatMap((group: { fields: any[] }) =>
            Array.isArray(group.fields) ? group.fields : []
        );

        const scaleLimit = isAccuracyEnabled ? parseInt(allFields[1].value, 10) : 4;
        const threshold = isAccuracyEnabled ? parseInt(allFields[2].value, 10) : 4;
        const scalingType = isAccuracyEnabled ? allFields[0].value : 'Truncate';

        const factor = Math.pow(10, scaleLimit);
        let adjustedAmount = Number(amount.toFixed(10));
        const stringAmount = adjustedAmount.toString();
        const decimalPart = stringAmount.split('.')[1] || '';

        switch (scalingType) {
            case 'Round Up':
                adjustedAmount = Number(adjustedAmount.toFixed(scaleLimit));
                if (adjustedAmount % 1 !== 0 && adjustedAmount % 1 >= threshold / 10) {
                    adjustedAmount = Math.ceil(adjustedAmount * factor) / factor;
                }
                break;
            case 'Round Down':
                if (decimalPart.length > scaleLimit) {
                    const extraDigit = parseInt(decimalPart[scaleLimit] || '0', 10);
                    if (extraDigit <= threshold) {
                        adjustedAmount = Math.floor(adjustedAmount * factor) / factor - 1 / factor;
                    } else {
                        adjustedAmount = Math.floor(adjustedAmount * factor) / factor;
                    }
                } else {
                    adjustedAmount = Number(adjustedAmount.toFixed(scaleLimit));
                }
                break;
            case 'Truncate':
                adjustedAmount = Math.trunc(adjustedAmount * factor) / factor;
                break;
            default:
                return amount.toString();
        }

        return adjustedAmount.toFixed(scaleLimit);
    }

}

export default AccuracyConfiguration;