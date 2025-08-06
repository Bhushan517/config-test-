
import { QueryTypes } from 'sequelize';
import Candidate from '../models/candidate.model';
import ProgramsConfig from '../models/programs-config.model';
import { sequelize } from '../config/instance';

export const generateCandidateCode = async (): Promise<string> => {
    const count = await Candidate.count(); // Remove the where clause to count all records
    const nextNumber = (count + 1).toString().padStart(5, '0');
    return `CAN-${nextNumber}`;
};

export const CandidateCodeGenerate = async (vendor_id: string, program_id: string): Promise<string> => {
    const [vendor] = await sequelize.query<{ vendor_code: any, display_name: any, id: any }>(
        `SELECT pv.id, t.vendor_code, t.display_name
         FROM program_vendors AS pv
         LEFT JOIN tenant AS t ON t.id = pv.tenant_id
         WHERE 
            pv.id = :vendor_id
            AND pv.program_id = :program_id
         LIMIT 1`,
        {
            replacements: { vendor_id, program_id },
            type: QueryTypes.SELECT,
        }
    );
    const vendor_code = vendor?.vendor_code?.toUpperCase() ?? vendor?.display_name.substring(0, 3).toUpperCase();

    const count = await Candidate.count({ where: { vendor_id: vendor?.id } });
    const nextNumber = (count + 1).toString().padStart(5, '0');

    return `${vendor_code}-CAN-${nextNumber}`;
};

export const CandidateUniqueIdGenerate = async (program_id: string, user: any): Promise<string> => {
    const programConfig = await ProgramsConfig.findOne({
        where: {
            program_id,
            config_model: 'platform',
            title: 'Unique Id'
        },
        attributes: ['value']
    });

    if (!programConfig) return '--';
    const uniqueIdFormat = programConfig.value?.value;

    const firstName = user?.first_name ?? '';
    const lastName = user?.last_name ?? '';

    // Get first N characters and uppercase
    const getSubstring = (str: string, length: number) =>
        str?.substring(0, length)?.toUpperCase() || '';

    // Parse and format birthdate
    const parseBirthDate = () => {
        const birthDate = user?.birth_date || '01/01';

        try {
            const [month, day] = birthDate.split('/');
            return {
                month: String(parseInt(month)).padStart(2, '0'),
                day: String(parseInt(day)).padStart(2, '0')
            };
        } catch (error) {
            return { month: '01', day: '01' };
        }
    };

    const { month: formattedMonth, day: formattedDay } = parseBirthDate();

    // Extract last N digits
    const getLastNDigits = (value: string | number, n: number) => {
        const str = value?.toString() || '';
        return str.length > n ? str.slice(-n) : str.padStart(n, '0');
    };

    const stateNationalId = getLastNDigits(user?.state_national_id, 3);
    const ssnId = getLastNDigits(user?.ssn_id, 4);

    // Format combinations
    switch (uniqueIdFormat) {
        case 'FF-DD-MM':
            return `${getSubstring(firstName, 2)}${formattedDay}${formattedMonth}`;

        case 'FF-MM-DD':
            return `${getSubstring(firstName, 2)}${formattedMonth}${formattedDay}`;

        case 'FF-MM-DD-XXX':
            return `${getSubstring(firstName, 2)}${formattedMonth}${formattedDay}${stateNationalId}`;

        case 'FF-MM-DD-XXXX':
            return `${getSubstring(firstName, 2)}${formattedMonth}${formattedDay}${ssnId}`;

        case 'FFF-LLL-MM-DD':
            return `${getSubstring(firstName, 3)}${getSubstring(lastName, 3)}${formattedMonth}${formattedDay}`;

        case 'FL-MM-DD':
            return `${getSubstring(firstName, 1)}${getSubstring(lastName, 1)}${formattedMonth}${formattedDay}`;

        case 'LL-MM-DD':
            return `${getSubstring(lastName, 2)}${formattedMonth}${formattedDay}`;

        case 'LL-MM-DD-XXX':
            return `${getSubstring(lastName, 2)}${formattedMonth}${formattedDay}${stateNationalId}`;

        case 'LL-MM-DD-XXXX':
            return `${getSubstring(lastName, 2)}${formattedMonth}${formattedDay}${ssnId}`;

        default:
            return '--';
    }
};