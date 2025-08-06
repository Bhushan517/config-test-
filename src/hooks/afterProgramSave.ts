import { Model, QueryTypes } from 'sequelize';
import ProgramModule from '../models/program-module.model';
import { Module } from '../models/module.model';
import hierarchies from '../models/hierarchies.model';
import generateSlug from '../plugins/slugGenerate';
import qualificationTypeModel from '../models/qualification-type-model'
import rateType from '../models/rate-type.model';
import { sequelize } from '../config/instance';
import { fetchProgramConfigValues } from '../utility/queries';
import CountyModel from '../models/county.model';


export const createProgramModule = async (record: Model,transaction: any) => {

    let modules = await Module.findAll({
        where: {
            is_deleted: false,
            is_enabled: true,
            parent_module_id: null
        },
        transaction 
    });
    let module = modules.map((module: any) => ({
        module_id: module?.id,
        is_enabled: module?.is_enabled,
    }));
    await ProgramModule.create({
        program_id: (record as any).id,
        modules: module,
    },{transaction});
};

export const createHierarchy = async (record: Model, transaction: any) => {
    const { id: programId, display_name ,unique_id} = record as any;
  
    const code = generateSlug(display_name, {
        trim: true,
        removedspecial: true,
    });
    const [country] = await sequelize.query(
  `
    SELECT id FROM countries
    WHERE name = :name
    LIMIT 1
  `,
  {
    replacements: { name: "United States" },
    type: QueryTypes.SELECT,
    transaction,
  }
)as any;

  const countyId = country?.id || null;
    const hierarchy = await hierarchies.create({
        program_id: programId,
        name : display_name,
        code: unique_id,
        hierarchy_level: 1,
        hierarchy_order: 1,
        is_enabled: true,        
        default_date_format: "MM/DD/YYYY",
        default_time_format: "24 Hours",
        default_timezone : "(UTC-05:00) Eastern Standard Time (North America)",
        default_currency: "USD",
        default_language : "English",
        unit_of_measure: [
            {
                label: "hourly",
                is_default: true
            }
        ],
        rate_model: "bill_rate",
        is_vendor_neutral_program: false,
        is_hide_candidate_img: false,
        support_email: "noreply@simplifyvms.com",
        address:[
            {
                country:countyId,
            }
        ]
    },{ transaction });

    return hierarchy;
};

export const createQualificationTypes = async (record: Model,transaction: any) => {
    const defaultQualificationTypes = [
        { name: 'Certifications', code: 'certifications', type: 'predefined' },
        { name: 'Speciality', code: 'speciality', type: 'predefined' },
        { name: 'Skill', code: 'skill', type: 'predefined' },
        { name: 'Education', code: 'education', type: 'predefined' },
        { name: 'Vaccination', code: 'vaccination', type: 'predefined' }, 
    ];

    for (let qualification of defaultQualificationTypes) {
        await qualificationTypeModel.create({
            program_id: (record as any).id,
            name: qualification.name,
            code: qualification.code,
            type: qualification.type,
            is_enabled: true,
            is_deleted: false,
            created_by: (record as any).created_by,
            updated_by: (record as any).updated_by,
        },{transaction});
    }
};

export const createRateTypes = async (record: Model,transaction: any) => {
    const picklistItemResult = await sequelize.query<{ id: any }>(
        `SELECT id 
         FROM picklistitems
         WHERE defined_by = 'predefined' 
           AND label = 'Standard'
         LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    const picklistItemId = picklistItemResult[0].id;

    await rateType.create({
        program_id: (record as any).id,
        name: "Standard Rate",
        rate_type_category: picklistItemId,
        rate: null,
        abbreviation: "ST",
        is_enabled: true,
        is_deleted: false,
        is_shift_rate: false,
        is_base_rate: true,
        created_by: (record as any).created_by,
        updated_by: (record as any).updated_by,
    },{transaction});
} 