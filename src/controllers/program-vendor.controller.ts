import { ProgramVendor } from "../models/program-vendor.model";
import { FastifyRequest, FastifyReply } from "fastify";
import generateCustomUUID from "../utility/genrateTraceId";
import { programVendorInterface, programVendorQueryInterface } from "../interfaces/program-vendor.interface";
import UserMapping from "../models/user-mapping.model";
import Tenant from "../models/tenant.model";
import vendorMarkupConfig from "../models/vendor-markup-config.model";
import VendorGroup from "../models/vendor-group.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { sequelize } from "../config/instance";
import { Op, QueryTypes } from "sequelize";
import { complianceDocumentGetByUserAndDocumentId, complianceDocumentGetByUserId, complianceDocumentGetByVendorAndDocumentId, complianceDocumentGetByVendorId, complianceGroupQueryWithUserId, complianceGroupQueryWithVendorId, getComplianceDocuments, getProgramVendorDetails, getVendorMarkups, programVendorAdvancedFilter, programVendorQuery, vendorDataQuery, vendorFilterQueryBuilder } from "../utility/queries";
import { VendorComplianceDocumentInterface } from "../interfaces/vendor-compliance-document.interface";
import VendorComplianceDocumentModel from "../models/vendor-compliance-document.model";
import VendorComplianceReqDocMappingModel from "../models/vendor-compliance-req-doc-mapping.model";
import VendorDocumentGroupModel from "../models/vendor-document-group.model";
import UserModel from "../models/user.model";
import VendorCustomField from "../models/vendor-custom-field.model";
import { getCustomsField } from "../utility/get-custom-field";
import { replace } from "lodash";
import { parseValue } from "../utility/parse-value";
interface VendorDetails {
    document_details: any;
    doc_id: any;
    compliance_note: any;
    last_name: any;
    first_name: any;
    audited_on: any;
    audited_by: any;
    expiry_on: any;
    url: any;
    file_name: any;
    display_name: any;
    document_number: any;
    regain_compliance_days: null;
    attached_doc_url: null;
    created_on: any;
    updated_on: any;
    is_deleted: any;
    no_of_days: any;
    uploaded_document_status: string;
    uploaded_document_expiry_on: any;
    uploaded_document_file_name: any;
    uploaded_document_audited_by: string;
    uploaded_document_audited_on: null;
    work_location: null;
    vendor_name: any;
    act: any;
    program_id: any;
    next_expiry_on: null;
    max_phone_length: any;
    min_phone_length: any;
    iso_code_3: any;
    iso_code_2: any;
    isd_code: any;
    uploaded_document: any;
    to_uploaded: any;
    upload_document_days: number;
    name: any;
    total_count: number;
    id: any;
    status: any;
    tenant_id: any;
    compliance_documents: any;
    is_enabled: any
}


export async function getProgramVendors(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            vendor_name,
            user_id,
            status,
            updated_on,
            hierarchy_ids,
            page: pageStr,
            limit: limitStr
        } = request.query as programVendorQueryInterface & { page?: string; limit?: string; hierarchy_ids?: any };

        const filters: any = { program_id, is_deleted: false };

        if (vendor_name) {
            filters.vendor_name = { [Op.like]: `%${vendor_name}%` };
        }


        if (hierarchy_ids && typeof hierarchy_ids === 'string') {
            const hierarchyArray = hierarchy_ids.split(',').map(id => id.trim());
            if (hierarchyArray.length > 0) {
                filters[Op.or] = [
                    { all_hierarchy: true },
                    ...hierarchyArray.map(id =>
                        sequelize.where(
                            sequelize.fn(
                                'JSON_CONTAINS',
                                sequelize.col('hierarchies'),
                                JSON.stringify(id)
                            ),
                            true
                        )
                    )
                ];
            }
        }


        if (user_id !== undefined) {
            const userRecord = await UserModel.findOne({ where: { user_id: user_id } });
            if (!userRecord) {
                return reply.status(404).send({
                    status_code: 404,
                    message: 'User  not found.',
                    trace_id: traceId,
                });
            }
            filters.tenant_id = userRecord.tenant_id;
        }

        if (status) {
            filters.status = status;
        }

        if (updated_on) {
            filters.updated_on = updated_on;
        }

        const queryOptions: any = {
            where: filters,
            order: [['updated_on', 'DESC']],
        };

        if (!user_id) {
            queryOptions.attributes = [
                'id', 'program_id', 'tenant_id', 'com_doc_group', 'display_name', 'vendor_name',
                'updated_on', 'status', 'job', 'created_on', 'candidate', 'compliance_status', 'contact', 'diversity_details'
            ];
        }

        if (pageStr && limitStr) {
            const page = parseInt(pageStr, 10);
            const limit = parseInt(limitStr, 10);
            queryOptions.limit = limit;
            queryOptions.offset = (page - 1) * limit;
        }

        const { rows: program_vendors, count: totalItems } = await ProgramVendor.findAndCountAll(queryOptions);

        const countryIds = new Set();
        program_vendors.forEach(vendor => {
            vendor.addresses?.forEach((address: { country: unknown; }) => {
                if (address.country) countryIds.add(address.country);
            });
            vendor.diversity_details?.forEach((diversity: { country: unknown; }) => {
                if (diversity.country) countryIds.add(diversity.country);
            });
        });

        const countryIdsArray = Array.from(countryIds);
        let countries: any[] = [];

        if (countryIdsArray.length > 0) {
            countries = await sequelize.query(
                `SELECT * FROM countries WHERE id IN (:countryIds)`,
                {
                    replacements: { countryIds: countryIdsArray },
                    type: QueryTypes.SELECT,
                }
            );
        }

        const countryMap: { [key: string]: any } = countries.reduce((acc: { [key: string]: any }, country: any) => {
            acc[country.id] = country;
            return acc;
        }, {});

        const processedVendors = await Promise.all(
            program_vendors.map(async (vendor) => {
                const vendorDocumentGroups = await VendorDocumentGroupModel.findAll({
                    where: { id: vendor.com_doc_group },
                });

                let compliance_status = {
                    status: 'Non-Compliant',
                    is_audited: false,
                    is_compliant: false,
                };

                if (vendorDocumentGroups.length > 0) {
                    const required_documentsIds = vendorDocumentGroups[0].required_documents;

                    const required_documents = await VendorComplianceDocumentModel.findAll({
                        where: {
                            id: required_documentsIds,
                        },
                    });

                    const allDocumentsCompliant = await Promise.all(required_documents.map(async (doc) => {
                        const mapping = await VendorComplianceReqDocMappingModel.findOne({
                            where: { required_document_id: doc.id, vendor_id: vendor.id }
                        });

                        return mapping && mapping.status.toLowerCase() === 'compliant';
                    }));
                    if (allDocumentsCompliant.every(status => status)) {
                        compliance_status = {
                            status: 'Compliant',
                            is_audited: true,
                            is_compliant: true,
                        };
                    }
                }

                vendor.compliance_status = compliance_status;

                vendor.addresses = vendor.addresses?.map((address: { country: string | number; }) => {
                    const country = countryMap[address.country];
                    if (country) {
                        return {
                            ...address,
                            country: {
                                id: country.id,
                                name: country.name,
                                isd_code: country.isd_code,
                                iso_code_2: country.iso_code_2,
                                iso_code_3: country.iso_code_3,
                                min_phone_length: country.min_phone_length,
                                max_phone_length: country.max_phone_length,
                            },
                        };
                    }
                    return address;
                });

                vendor.diversity_details = vendor.diversity_details?.map((diversity: { country: string | number; }) => {
                    const country = countryMap[diversity.country];
                    if (country) {
                        return {
                            ...diversity,
                            country: {
                                id: country.id,
                                name: country.name,
                            },
                        };
                    }
                    return diversity;
                });

                const vendorDetails = await sequelize.query(getProgramVendorDetails, {
                    replacements: { program_id: program_id, id: vendor.id || null },
                    type: QueryTypes.SELECT,
                }) as any;
                const [customFieldsResult] = (await sequelize.query(
                    getCustomsField(
                        vendor.id,
                        "vendor_custom_field",
                        "vendor_id",
                        "custom_field_id"
                    ),
                    {
                        replacements: { id: vendor.id },
                        type: QueryTypes.SELECT,
                    }
                )) as any;
                const customFields = customFieldsResult?.custom_fields.map(
                    (field: any) => ({
                        ...field,
                        value: parseValue(field.value),
                    })
                );

                const transformedVendor = {
                    ...vendor.toJSON(),
                    hierarchies: vendorDetails.length > 0 ? vendorDetails[0].hierarchies : [],
                    work_locations: vendorDetails.length > 0 ? vendorDetails[0].work_locations : [],
                    associate_labour_category: vendorDetails.length > 0 ? vendorDetails[0].labour_category : [],
                    custom_fields: customFields || []
                };

                return transformedVendor;
            })
        );

        reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendors fetched successfully.',
            trace_id: traceId,
            items_per_page: pageStr && limitStr ? parseInt(limitStr, 10) : null,
            total_records: totalItems,
            program_vendors: processedVendors,
        });
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching ProgramVendors.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
}

export async function saveProgramVendor(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let users: any = await decodeToken(token);

    if (!users) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const { tenant, user, 'user-group-mapping': userGroupMapping } = request.body as any;
    console.log('tenant', request.body);
    const { id, ...userWithoutId } = user
    console.log("weruyitur", user)
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    if (!program_id) {
        return reply.status(400).send({
            status_code: 400,
            message: 'Program ID is required.',
            trace_id: traceId,
        });
    }

    logger(
        {
            trace_id: traceId,
            actor: {
                user_name: users?.preferred_username,
                user_id: users?.sub,
            },
            data: request.body,
            eventname: "creating programVendor",
            status: "success",
            description: `Creating programVendor for ${program_id}`,
            level: 'info',
            action: request.method,
            url: request.url,
            entity_id: program_id,
            is_deleted: false
        },
        ProgramVendor
    );

    const transaction = await sequelize.transaction();
    try {
        if (!tenant || !user) {
            return reply.status(400).send({
                status_code: 400,
                message: 'Tenant or User information is missing.',
                trace_id: traceId,
            });
        }

        const vendor = {
            vendor_name: tenant.name,
            status: 'Pending Setup',
            vendor_logo: user?.avatar?.url,
            display_name: tenant.display_name,
            vendor_code: tenant.tenant_code,
            addresses: user.addresses,
            tenant_id: tenant.id,
            background_logo_color: tenant.background_logo_color,
            job_title: user.job_title,
        }

        const contact = [
            {
                first_name: user.first_name,
                middle_name: user.middle_name,
                last_name: user.last_name,
                email: user.email,
                addresses: user.addresses
            }
        ]
        let tenantData;
        const tenants = await Tenant.findOne({ where: { id: tenant.id } });
        if (!tenants) {
            tenantData = await Tenant.create({ ...tenant }, { transaction });
        }
        else {
            tenantData = tenants
        }
        const programVendors = await ProgramVendor.create({ ...vendor, program_id }, { transaction });
        const userData = await UserModel.create({ ...userWithoutId, user_type: user.user_type.toLowerCase(), user_id: user.id, tenant_id: tenantData.id, status: user.status, program_id, vendor_id: programVendors.id, title: user.job_title }, { transaction });
        await UserMapping.create({ id: userGroupMapping.id, user_type: userGroupMapping.user_type.toLowerCase(), status: userGroupMapping.status, tenant_id: tenantData.id, user_id: userData.user_id, program_id, role_id: user.role_id }, { transaction });

        await ProgramVendor.update(
            { user_id: userData.user_id, contact },
            { where: { id: programVendors.id, program_id }, transaction }
        );

        await transaction.commit();

        reply.status(201).send({
            status_code: 201,
            message: 'ProgramVendor created successfully.',
            trace_id: traceId,
            id: programVendors.id,
        });

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: users?.preferred_username,
                    user_id: users?.sub,
                },
                data: request.body,
                eventname: "create programVendor",
                status: "success",
                description: `create programVendor for ${program_id} successfully: ${programVendors.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            ProgramVendor
        );

    } catch (error: any) {
        // Rollback transaction in case of an error
        await transaction.rollback();

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: users?.preferred_username,
                    user_id: users?.sub,
                },
                data: request.body,
                eventname: "create programVendor",
                status: "failed",
                description: `create programVendor for ${program_id} failed`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            ProgramVendor
        );
        console.log("Validation errors:", error.errors || error.message);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while saving ProgramVendor.',
            trace_id: traceId,
            error: (error as any).message,
        });
    }
};

export const updateProgramVendor = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, tenant_id } = request.params as { program_id: string; tenant_id: string };
    const programVendorData = request.body as Partial<programVendorInterface>;
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const userId = user?.sub;
    const transaction = await sequelize.transaction();

    try {
        const existingProgramVendor = await ProgramVendor.findOne({ where: { program_id, tenant_id }, transaction });
        if (!existingProgramVendor) {
            await transaction.rollback();
            return reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found for update.',
                trace_id: traceId,
                program_vendor: []
            });
        }

        const normalizeEmptyArrayToNull = (obj: Record<string, any>) => {
            for (const key in obj) {
                if (Array.isArray(obj[key]) && obj[key].length === 0) {
                    obj[key] = null;
                }
            }
        };

        normalizeEmptyArrayToNull(programVendorData);

        await existingProgramVendor.update(
            { ...programVendorData, updated_by: userId, updated_on: Date.now() },
            { transaction }
        );

        const userUpdatePayload: any = {};
        if (programVendorData.hierarchies) userUpdatePayload.associate_hierarchy_ids = programVendorData.hierarchies;
        if (programVendorData.all_hierarchy) userUpdatePayload.is_all_hierarchy_associate = programVendorData.all_hierarchy;
        if (programVendorData.work_locations) userUpdatePayload.work_location_ids = programVendorData.work_locations;
        if (programVendorData.all_work_locations) userUpdatePayload.is_all_work_location_associate = programVendorData.all_work_locations;
        if (programVendorData.program_industry) userUpdatePayload.associate_labour_category = programVendorData.program_industry;
        if (programVendorData.is_labour_category) userUpdatePayload.is_all_labour_category_associate = programVendorData.is_labour_category;
        if (programVendorData.all_job_type) userUpdatePayload.is_all_job_type_associate = programVendorData.all_job_type;
        if (programVendorData.job_type) userUpdatePayload.associate_job_type = programVendorData.job_type;
        if (programVendorData.contact) userUpdatePayload.contacts = programVendorData.contact;

        if (Object.keys(userUpdatePayload).length > 0) {
            await UserModel.update(userUpdatePayload, {
                where: {
                    user_id: existingProgramVendor.user_id,
                    program_id
                },
                transaction
            });
        }

        if (programVendorData.vendor_group_id && Array.isArray(programVendorData.vendor_group_id)) {
            const allVendorGroups = await VendorGroup.findAll({
                where: { program_id: program_id, is_deleted: false },
                transaction
            });

            for (const vendorGroup of allVendorGroups) {
                let vendorsArray: string[] = Array.isArray(vendorGroup.vendors) ? vendorGroup.vendors : [];
                if (programVendorData.vendor_group_id.includes(vendorGroup.id)) {
                    if (!vendorsArray.includes(existingProgramVendor.id)) {
                        vendorsArray.push(existingProgramVendor.id);
                        await VendorGroup.update(
                            { vendors: vendorsArray },
                            { where: { id: vendorGroup.id }, transaction }
                        );
                    }
                } else {
                    if (vendorsArray.includes(existingProgramVendor.id)) {
                        vendorsArray = vendorsArray.filter(id => id !== existingProgramVendor.id);
                        await VendorGroup.update(
                            { vendors: vendorsArray },
                            { where: { id: vendorGroup.id }, transaction }
                        );
                    }
                }
            }
        }

        if (programVendorData.com_doc_group || programVendorData.com_doc_group === null) {
            if (programVendorData.com_doc_group && Array.isArray(programVendorData.com_doc_group)) {
                const complianceDocuments = await sequelize.query<{ id: any }>(`   
                   SELECT DISTINCT vd.id 
                   FROM vendor_document_groups vdg
                   JOIN JSON_TABLE(
                      vdg.required_documents,
                      '$[*]' COLUMNS (doc_id VARCHAR(255) PATH '$')
                   ) AS docs ON true
                   JOIN vendor_compliance_documents vd ON vd.id = docs.doc_id
                   WHERE vdg.id IN (:groupIds);`,
                    { replacements: { groupIds: programVendorData.com_doc_group, }, type: QueryTypes.SELECT, transaction, }
                );

                for (const doc of complianceDocuments) {
                    const existingMapping = await VendorComplianceReqDocMappingModel.findOne({
                        where: {
                            vendor_id: existingProgramVendor.id,
                            required_document_id: doc.id,
                        },
                        transaction,
                    });

                    if (!existingMapping) {
                        await VendorComplianceReqDocMappingModel.create(
                            {
                                vendor_id: existingProgramVendor.id,
                                required_document_id: doc.id,
                                program_id: program_id,
                                status: "Pending Upload",
                                created_on: Date.now(),
                                updated_on: Date.now(),
                                created_by: userId,
                                updated_by: userId,
                            },
                            { transaction }
                        );
                    }
                }
            } else {
                await VendorComplianceReqDocMappingModel.destroy({
                    where: {
                        vendor_id: existingProgramVendor.id,
                        program_id: program_id,
                    },
                    transaction,
                });
            }
        }

        await vendorMarkupConfig.destroy({
            where: { program_id, program_vendor_id: existingProgramVendor.id },
            transaction
        });

        if (programVendorData.markup_config && Array.isArray(programVendorData.markup_config)) {
            for (const markup of programVendorData.markup_config) {
                const { id, ...markupData } = markup;
                const fieldsToCheck = [
                    'hierarchy', 'work_locations', 'program_industry',
                    'rate_type', 'job_type', 'job_template',
                    'worker_type', 'worker_classification', 'rate_model'
                ];

                fieldsToCheck.forEach(field => {
                    if (markupData[field] === 'all' || (Array.isArray(markupData[field]) && markupData[field].length === 0)) {
                        markupData[field] = null;
                    }
                });

                const whereClause: Record<string, any> = {
                    program_id,
                    program_vendor_id: existingProgramVendor.id,
                    hierarchy: markup.hierarchy === 'all' ? null : markup.hierarchy,
                    rate_model: markup.rate_model === 'all' ? null : markup.rate_model,
                    program_industry: markup.program_industry === 'all' ? null : markup.program_industry,
                    rate_type: markup.rate_type === 'all' ? null : markup.rate_type,
                    worker_type: markup.worker_type === 'all' ? null : markup.worker_type,
                    worker_classification: markup.worker_classification === 'all' ? null : markup.worker_classification,
                    job_template: markup.job_template === 'all' ? null : markup.job_template,
                    markups: markup.markups,
                };

                if (markup.job_type !== undefined) {
                    whereClause.job_type = markup.job_type === 'all' ? null : markup.job_type;
                }
                if (markup.work_locations !== undefined) {
                    whereClause.work_locations = markup.work_locations === 'all' ? null : markup.work_locations;
                }

                const existingRecord = await vendorMarkupConfig.findOne({
                    where: whereClause,
                    transaction
                });

                if (existingRecord) {
                    throw new Error("A record with the same markup already exists.");
                }

                await vendorMarkupConfig.create({
                    ...markupData,
                    program_vendor_id: existingProgramVendor.id,
                    program_id,
                    created_by: userId,
                    updated_by: userId
                }, { transaction });
            }
        }

        if (programVendorData.custom_fields !== undefined) {
            await VendorCustomField.destroy({
                where: { vendor_id: programVendorData.id },
                transaction
            });

            if (Array.isArray(programVendorData.custom_fields) && programVendorData.custom_fields.length > 0) {
                const customFields = programVendorData.custom_fields.map((field: { id: any; value: any; }) => ({
                    program_id,
                    custom_field_id: field.id,
                    value: field.value,
                    vendor_id: programVendorData.id,
                }));
                await VendorCustomField.bulkCreate(customFields, { transaction });
            }
        }

        await transaction.commit();

        reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendor and VendorMarkupConfig updated successfully.',
            trace_id: traceId,
        });

    } catch (error) {
        await transaction.rollback();
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating ProgramVendor.',
            trace_id: traceId,
            error: (error as any).message
        });
    }
};

export async function deleteProgramVendor(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const program_vendor = await ProgramVendor.findOne({ where: { program_id, id } });
        if (program_vendor) {
            await ProgramVendor.update({ is_deleted: true }, {
                where: {
                    program_id, id, created_by: userId,
                    updated_by: userId,
                }
            });
            reply.status(204).send({
                status_code: 204,
                message: 'ProgramVendor deleted successfully.',
                trace_id: traceId,
            });
        } else {
            reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found.',
                trace_id: traceId,
                program_vendor: [],
            });
        }
    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while deleting ProgramVendor.',
            trace_id: traceId,
            error: error,
        });
    }
}

export const getProgramVendorById = async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateCustomUUID();
    const { program_id, id } = request.params as { program_id: string; id: string };
    try {
        const vendorData = await sequelize.query<ProgramVendor>(vendorDataQuery, {
            replacements: { id, program_id },
            type: QueryTypes.SELECT
        });

        if (vendorData.length === 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Program vendor not found.',
                trace_id: traceId,
                program_vendor: null,
            });
        }

        const programVendor: ProgramVendor = vendorData[0];
        const [customFieldsResult] = await sequelize.query(
            getCustomsField(programVendor.id, 'vendor_custom_field', 'vendor_id', 'custom_field_id'),
            {
                replacements: { id: programVendor.id },
                type: QueryTypes.SELECT
            }
        ) as any;
        const customFields = customFieldsResult?.custom_fields
            .map((field: any) => ({
                ...field,
                value: parseValue(field.value),
            }))

        return reply.status(200).send({
            status_code: 200,
            message: 'Program vendor data fetched successfully.',
            trace_id: traceId,
            program_vendor: {
                ...programVendor,
                custom_field: customFields || []

            },
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while retrieving program vendor data.',
            trace_id: traceId,
            error: error.message
        });
    }
};

export async function getVendorAndVendorGroup(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const { program_id } = request.params as { program_id: string };
    const { hierarchy_ids, labor_category_id, work_location_id, search } = request.query as {
        hierarchy_ids?: string;
        labor_category_id?: string;
        work_location_id?: string;
        search?: string;
    };
    try {
        const hierarchyIdsArray = hierarchy_ids ? hierarchy_ids.split(',').map(id => id.trim()) : [];
        const laborCategoryIdsArray = labor_category_id ? labor_category_id.split(',').map(id => id.trim()) : [];
        const workLocationIdsArray = work_location_id ? work_location_id.split(',').map(id => id.trim()) : [];

        let vendorFilterQuery = vendorFilterQueryBuilder(
            hierarchyIdsArray,
            laborCategoryIdsArray,
            workLocationIdsArray
        );

        const vendorReplacements: Record<string, any> = {
            program_id,
        };
        hierarchyIdsArray.forEach((id, index) => {
            vendorReplacements[`hierarchy_ids${index}`] = id;
        });
        laborCategoryIdsArray.forEach((id, index) => {
            vendorReplacements[`labor_category_id${index}`] = id;
        });
        workLocationIdsArray.forEach((id, index) => {
            vendorReplacements[`work_location_id${index}`] = id;
        });

        if (search) {
            vendorFilterQuery += ` AND display_name LIKE :search`;
            vendorReplacements['search'] = `%${search}%`;
        }

        const filteredVendors = await sequelize.query<VendorDetails>(vendorFilterQuery, {
            replacements: vendorReplacements,
            type: QueryTypes.SELECT,
        });

        const vendorGroupQuery: { where: Record<string, any>; attributes: any } = {
            where: { program_id, is_deleted: false, is_enabled: true },
            attributes: ['id', 'vendor_group_name'],
        };

        if (search) {
            vendorGroupQuery.where.vendor_group_name = { [Op.like]: `%${search}%` };
        }

        const vendorGroups = await VendorGroup.findAll(vendorGroupQuery);

        const responseVendors = filteredVendors.map(vendor => ({
            id: vendor.id,
            vendor: vendor.display_name,
        }));

        const combinedResponse = [
            ...responseVendors,
            ...vendorGroups.map(group => ({
                id: group.id,
                vendor: group.vendor_group_name,
                is_group: true,
            })),
        ];

        reply.status(200).send({
            status_code: 200,
            message: 'Vendors retrieved successfully',
            vendors: combinedResponse,
            trace_id: traceId,
        });

    } catch (error) {
        reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
            error: (error as Error).message,
        });
    }
}

export async function updateProgramVendorByUserId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const { program_id, user_id } = request.params as { program_id: string; user_id: string };
    const programVendorData = request.body as Partial<programVendorInterface>;
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }
    const token = authHeader.split(' ')[1];
    let user: any = await decodeToken(token);
    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }
    const userId = user?.sub;

    try {
        const existingProgramVendor = await ProgramVendor.findOne({ where: { program_id, user_id } });

        if (!existingProgramVendor) {
            return reply.status(200).send({
                status_code: 200,
                message: 'ProgramVendor not found for update.',
                trace_id: traceId,
                program_vendor: []
            });
        }
        await existingProgramVendor.update(programVendorData, {
            where: {
                created_by: userId,
                updated_by: userId,
            }
        });

        if (programVendorData.markup_config && Array.isArray(programVendorData.markup_config)) {
            for (const markup of programVendorData.markup_config) {
                await vendorMarkupConfig.upsert({
                    id: markup.id,
                    program_id: existingProgramVendor.program_id,
                    program_vendor_id: existingProgramVendor.id,
                    ...markup,
                    is_enabled: true,
                    is_deleted: false,
                });
            }
        }

        const updatedVendor = await ProgramVendor.findOne({ where: { program_id, user_id } });

        reply.status(200).send({
            status_code: 200,
            message: 'ProgramVendor and VendorMarkupConfig updated successfully.',
            trace_id: traceId,
            program_vendor: updatedVendor,
        });

    } catch (error) {
        console.error('Error updating ProgramVendor:', error);
        reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while updating ProgramVendor.',
            trace_id: traceId,
            error: error,
        });
    }
};

export const getVendorDocuments = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id } = request.params as { program_id: string };
    const {
        vendor_id,
        document_id,
        page = '1',
        limit = '10',
        name = null,
        is_enabled = null,
        status = null,
        updated_on = null,
        next_expiry_on = null,
        compliance_verified = null,
        expiry_on = null
    } = request.query as {
        vendor_id?: string;
        document_id?: string;
        page?: string;
        limit?: string;
        name?: string;
        is_enabled?: string;
        status?: string;
        updated_on?: any;
        next_expiry_on?: any;
        compliance_verified?: string;
        expiry_on?: any;
    };
    const traceId = generateCustomUUID();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found' });
    }

    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token' });
    }

    const user_id = user?.sub;
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const offset = (pageNumber - 1) * pageSize;
    const statusArray = status ? status.split(',') : null;

    try {
        let documents: VendorDetails[] = [];
        let display_name;

        const getVendorRecord = async () => {
            return sequelize.query<{ id: any }>(
                `SELECT pv.id
                FROM user u
                JOIN program_vendors pv ON u.tenant_id = pv.tenant_id AND pv.program_id = :program_id
                WHERE u.user_id = :user_id AND u.program_id = :program_id`,
                {
                    replacements: { user_id, program_id },
                    type: QueryTypes.SELECT,
                }
            );
        };

        let replacements: Record<string, any> = {
            program_id,
            user_id,
            vendor_id,
            document_id,
            name: name ? `%${name}%` : null,
            is_enabled,
            limit: pageSize,
            offset,
            status: statusArray,
            updated_on,
            next_expiry_on,
            expiry_on,
            compliance_verified: compliance_verified ? `%${compliance_verified}%` : null
        };

        if (vendor_id && document_id) {
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByVendorAndDocumentId, {
                replacements,
                type: QueryTypes.SELECT,
            });
        } else if (vendor_id) {
            const vendorName = await sequelize.query<{ display_name: string }>(
                `SELECT display_name FROM program_vendors WHERE id = :vendor_id AND program_id = :program_id`,
                {
                    replacements: { vendor_id, program_id },
                    type: QueryTypes.SELECT,
                }
            );
            display_name = vendorName[0].display_name;
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByVendorId(replacements), {
                replacements,
                type: QueryTypes.SELECT,
            });
        } else if (user_id && document_id) {
            const vendorRecord = await getVendorRecord();
            const vendorId = vendorRecord[0]?.id;
            replacements.vendor_id = vendorId;
            documents = await sequelize.query<VendorDetails>(complianceDocumentGetByUserAndDocumentId, {
                replacements,
                type: QueryTypes.SELECT,
            });
        } else if (user_id) {
            try {
                const vendorRecord = await getVendorRecord();
                const vendorId = vendorRecord[0]?.id;

                if (!vendorId) {
                    return reply.status(400).send({
                        status_code: 400,
                        message: 'Vendor record not found for the user.',
                        trace_id: traceId,
                    });
                }

                replacements.vendor_id = vendorId;
                documents = await sequelize.query<VendorDetails>(complianceDocumentGetByUserId(replacements), {
                    replacements,
                    type: QueryTypes.SELECT,
                });
            } catch (error: any) {
                return reply.status(500).send({
                    status_code: 500,
                    message: 'An error occurred while fetching vendor documents for the user.',
                    trace_id: traceId,
                    error: error.message,
                });
            }
        } else {
            return reply.status(400).send({
                status_code: 400,
                message: 'Invalid request parameters.',
                trace_id: traceId,
            });
        }

        const totalCount = documents.length > 0 ? documents[0].total_count : 0;
        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalCount == 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'No compliance documents found for the given criteria.',
                trace_id: traceId,
                total_count: totalCount,
                page: pageNumber,
                limit: pageSize,
                total_pages: totalPages,
                display_name,
                uploaded_documents: [],
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Vendor documents fetched successfully.',
            trace_id: traceId,
            total_count: totalCount,
            page: pageNumber,
            limit: pageSize,
            total_pages: totalPages,
            display_name,
            uploaded_documents: documents.map(doc => ({
                id: doc.id,
                program_id: doc.program_id,
                name: doc.name,
                act: doc.act,
                document_number: doc.document_number,
                document_details: doc.document_details,
                upload_document_days: doc.upload_document_days,
                regain_compliance_days: doc.regain_compliance_days,
                attached_doc_url: doc.attached_doc_url,
                created_on: doc.created_on,
                updated_on: doc.updated_on,
                is_enabled: doc.is_enabled,
                is_deleted: doc.is_deleted,
                to_uploaded: doc.to_uploaded,
                no_of_days: doc.no_of_days,
                uploaded_document: {
                    id: doc.doc_id,
                    expiry_on: doc.expiry_on,
                    audited_on: doc.audited_on,
                    compliance_note: doc.compliance_note,
                    next_expiry_on: doc.next_expiry_on,
                    status: doc.status,
                    file_name: doc.file_name,
                    url: doc.url,
                    updated_on: doc.updated_on,
                    created_on: doc.created_on,
                    first_name: doc.first_name,
                    last_name: doc.last_name
                },
                work_location: doc.work_location,
                vendor_name: doc.display_name,
            })),
        });
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching vendor documents.',
            trace_id: traceId,
            error: error.message,
        });
    }
};

export const getProgramVendorByUserId = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    const { program_id } = request.params as { program_id: string };
    const { user_id, vendor_id } = request.query as { user_id?: string; vendor_id?: string };
    const traceId = generateCustomUUID();

    try {
        const hasUserId = !!user_id;
        const hasVendorId = !!vendor_id;

        const program_vendor = await sequelize.query<VendorDetails>(programVendorQuery(hasUserId, hasVendorId), {
            replacements: { program_id, user_id, vendor_id },
            type: QueryTypes.SELECT
        });

        if (!program_vendor.length) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor not found for the given program.',
                program_vendor: [],
                trace_id: traceId,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Vendor details fetched successfully.',
            trace_id: traceId,
            program_vendor: program_vendor
        });

    } catch (error) {
        return reply.status(500).send({
            status_code: 500,
            message: 'An error occurred while fetching vendor details.',
            trace_id: traceId,
        });
    }
};

export async function updateComplianceDocument(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id } = request.params as { program_id: string };
    const { document_id, vendor_id } = request.query as { document_id: string; vendor_id: string };
    const complianceDocumentUpdate = request.body as Partial<VendorComplianceDocumentInterface>;
    const traceId = generateCustomUUID();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Token not found', trace_id: traceId });
    }

    const token = authHeader.split(' ')[1];
    const user = await decodeToken(token);
    const user_id = user?.sub;;

    if (!user) {
        return reply.status(401).send({ status_code: 401, message: 'Unauthorized - Invalid token', trace_id: traceId });
    }

    try {
        const vendorId = vendor_id || (user_id ? await getVendorId(user_id, program_id) : null);

        if (!document_id || !vendorId) {
            return reply.status(400).send({
                status_code: 400,
                message: "Invalid query parameters. Please provide either a user_id or vendor_id along with document_id.",
                trace_id: traceId,
            });
        }

        const complianceDocuments = await sequelize.query<VendorDetails>(complianceGroupQueryWithVendorId, {
            replacements: { program_id, user_id, vendor_id: vendorId, document_id },
            type: QueryTypes.SELECT,
        });

        if (!complianceDocuments.length) {
            return reply.status(404).send({
                status_code: 404,
                message: "Program vendor or document not found.",
                trace_id: traceId,
                user_document: []
            });
        }

        const documentData = complianceDocuments[0];
        const uploadedDocument = complianceDocumentUpdate.uploaded_document;
        let nextUpdateDueDate;

        if (uploadedDocument?.expiry_on) {
            const expiryDate = validateAndParseDate(uploadedDocument?.expiry_on, traceId, reply);
            if (!expiryDate) return;

            const nextUpdateDate = calculateNextUpdateDueDate(expiryDate, documentData.no_of_days, documentData.to_uploaded);
            nextUpdateDueDate = nextUpdateDate.getTime();
        } else {
            nextUpdateDueDate = null;
        }

        const audited_by = await getAuditedBy(user, program_id);
        const audited_on = Date.now();

        const finalAudited_by = complianceDocumentUpdate.name ? audited_by : null;
        const finalAudited_on = complianceDocumentUpdate.name ? audited_on : null;

        await VendorComplianceReqDocMappingModel.destroy({
            where: {
                vendor_id: vendorId,
                program_id,
                required_document_id: document_id,
            }
        });

        if (uploadedDocument) {
            await VendorComplianceReqDocMappingModel.upsert({
                id: uploadedDocument.id ?? undefined,
                program_id,
                required_document_id: document_id,
                user_id: user_id,
                vendor_id: vendorId ?? null,
                url: uploadedDocument.url,
                uploaded_on: Date.now(),
                updated_on: Date.now(),
                created_on: uploadedDocument?.id ? undefined : Date.now(),
                compliance_note: uploadedDocument.compliance_note,
                file_name: uploadedDocument.file_name,
                next_expiry_on: nextUpdateDueDate,
                expiry_on: uploadedDocument.expiry_on,
                audited_on: finalAudited_on,
                audited_by: finalAudited_by,
                created_by: user_id,
                updated_by: user_id,
                status: uploadedDocument.status,
                is_enabled: true,
                is_deleted: false,
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: "Compliance document updated successfully.",
            trace_id: traceId,
        });

    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message
        });
    }
}

async function getVendorId(user_id: string, program_id: string) {
    const vendorRecord: any = await sequelize.query(
        `SELECT pv.id
         FROM user u
         JOIN program_vendors pv ON u.tenant_id = pv.tenant_id
         WHERE u.user_id = :user_id AND u.program_id = :program_id AND pv.program_id = :program_id`,
        {
            replacements: { user_id, program_id },
            type: QueryTypes.SELECT,
        }
    );
    return vendorRecord[0].id;
}

function validateAndParseDate(expiryDateFromPayload: string | undefined, traceId: string, reply: FastifyReply) {
    if (!expiryDateFromPayload) {
        reply.status(400).send({
            status_code: 400,
            message: "Expiry date must be provided in the uploaded_document.",
            trace_id: traceId,
        });
        return null;
    }

    const expiryDate = new Date(expiryDateFromPayload);
    if (isNaN(expiryDate.getTime())) {
        reply.status(400).send({
            status_code: 400,
            message: "Invalid expiry date format.",
            trace_id: traceId,
        });
        return null;
    }
    return expiryDate;
}

function calculateNextUpdateDueDate(expiryDate: Date, upload_document_days: number, status: string) {
    let nextUpdateDueDate = new Date(expiryDate);
    if (status === "Before Expiration") {
        nextUpdateDueDate.setDate(nextUpdateDueDate.getDate() - upload_document_days);
    } else if (status === 'After Expiration') {
        nextUpdateDueDate.setDate(nextUpdateDueDate.getDate() + upload_document_days);
    }
    return nextUpdateDueDate;
}

async function getAuditedBy(user: any, program_id: string) {
    const userData = await UserModel.findOne({
        where: { program_id, user_id: user.sub }
    });

    if (userData?.user_type?.toLowerCase() === 'vendor') {
        return "--";
    }
    return user.sub;
}

export async function getComplianceDocument(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const { program_id, user_id } = request.params as { program_id: string; user_id: string };
    const { document_id } = request.query as { document_id?: string };
    const traceId = generateCustomUUID();

    try {
        const query = document_id
            ? complianceGroupQueryWithUserId
            : getComplianceDocuments;

        const complianceDocuments = await sequelize.query(query, {
            replacements: { program_id, user_id, document_id },
            type: QueryTypes.SELECT,
        });

        if (!complianceDocuments || complianceDocuments.length === 0) {
            return reply.status(404).send({
                status_code: 404,
                message: 'Program vendor or compliance document not found.',
                trace_id: traceId,
                compliance_document: [],
            });
        }

        return reply.status(200).send({
            status_code: 200,
            message: 'Compliance documents retrieved successfully.',
            trace_id: traceId,
            data: complianceDocuments,
        });

    } catch (error) {
        console.error('Error fetching compliance document data:', error);
        return reply.status(500).send({
            status_code: 500,
            message: 'Internal Server Error',
            trace_id: traceId,
        });
    }
}

export async function advanceFilter(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            display_name,
            country_id,
            hierarchy_ids,
            labor_category_id,
            work_location_id,
            job_type,
            status,
            contact_email,
            full_name,
            compliance_status,
            is_audited,
            page,
            limit,
        } = request.body as {
            display_name: string;
            country_id: string;
            hierarchy_ids: string[];
            labor_category_id: string[];
            work_location_id: string[];
            job_type: string[];
            status: string;
            contact_email: string;
            full_name: string;
            compliance_status: string;
            is_audited: boolean;
            page: string;
            limit: string;
        };
        const finalComplianceStatus =
            compliance_status === 'Compliant' ? true :
                compliance_status === 'Non-Compliant' ? false :
                    null;

        const hasComplianceStatus = compliance_status !== undefined && compliance_status !== null && compliance_status !== '';
        const hasQueryName = !!display_name;
        const hasCountry = !!country_id;
        const hasPage = !!page;
        const hasLimit = !!limit;
        const hasStatus = !!status;
        const hasEmail = !!contact_email;
        const hasFullName = !!full_name;
        const hasAudited = !!is_audited;
        const hierarchyIdsArray = hierarchy_ids || [];
        const laborCategoryIdsArray = labor_category_id || [];
        const workLocationIdsArray = work_location_id || [];
        const jobtypeIdsArray = job_type || [];

        const pageNumber = hasPage ? parseInt(page, 10) : 1;
        const limitNumber = hasLimit ? parseInt(limit, 10) : 10;
        const offset = (pageNumber - 1) * limitNumber;

        const query = programVendorAdvancedFilter(
            hasQueryName,
            hasCountry,
            hasStatus,
            hasEmail,
            hasFullName,
            hasComplianceStatus,
            finalComplianceStatus,
            hasAudited,
            hierarchyIdsArray,
            laborCategoryIdsArray,
            workLocationIdsArray,
            jobtypeIdsArray,
        );

        const replacements: Record<string, any> = {
            program_id,
            display_name: display_name ? `%${display_name}%` : null,
            country_id: country_id ?? null,
            status: status ?? null,
            contact_email: contact_email ? `${contact_email}%` : null,
            full_name: full_name ? `${full_name.trim()}%` : null,
            compliance_status: hasComplianceStatus,
            is_audited: is_audited ?? null,
            limit: limitNumber,
            offset: offset,
        };

        hierarchyIdsArray.forEach((id, index) => {
            replacements[`hierarchy_ids${index}`] = id;
        });
        laborCategoryIdsArray.forEach((id, index) => {
            replacements[`labor_category_id${index}`] = id;
        });
        workLocationIdsArray.forEach((id, index) => {
            replacements[`work_location_id${index}`] = id;
        });
        jobtypeIdsArray.forEach((id, index) => {
            replacements[`job_type${index}`] = id;
        });

        const data = await sequelize.query<{ total_count: any }>(query, {
            replacements,
            type: QueryTypes.SELECT,
        });
        const totalRecords = data[0]?.total_count ? data[0].total_count : 0;;

        const transformedData = data.map((vendor: any) => {
            let statusText;
            const statusValue = vendor.compliance_status;

            if (statusValue === 1) {
                statusText = 'Compliant';
            } else if (statusValue === 0) {
                statusText = 'Non-Compliant';
            } else {
                statusText = 'Not-Applicable';
            }
            return {
                ...vendor,
                compliance_status: {
                    status: statusText,
                    is_audited: statusValue === 1,
                    is_compliant: statusValue === 1,
                },
            };
        });

        if (data.length > 0) {
            return reply.status(201).send({
                status_code: 201,
                message: 'Program vendors fetched successfully.',
                trace_id: traceId,
                total_records: totalRecords,
                program_vendors: transformedData,
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total_pages: Math.ceil(totalRecords / limitNumber),
                },
            });
        } else {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                total_records: totalRecords,
                message: "Program vendor not found.",
                program_vendors: [],
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total_pages: Math.ceil(totalRecords / limitNumber),
                }
            });
        }
    } catch (error: any) {
        console.log(error);
        return reply.status(500).send({
            status_code: 500,
            message: "Internal Server Error",
            trace_id: traceId,
            error: error.message
        });
    }
}

export async function getVendorMarkup(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string; id: string };
        const { rate_model, hierarchy = [], labor_category = [], job_template = [], worker_type = [], worker_classification = [], rate_type = [] } = request.body as {
            rate_model?: string;
            hierarchy?: string[];
            labor_category?: string[];
            job_template?: string[];
            worker_type?: string[];
            worker_classification?: string[];
            rate_type?: string[];
        };

        const query = getVendorMarkups({
            rate_model,
            hierarchy,
            labor_category,
            job_template,
            worker_type,
            worker_classification,
            rate_type,
        });

        const replacements: Record<string, any> = {
            program_id,
            program_vendor_id: id,
            ...(rate_model ? { rate_model } : {})
        };

        hierarchy.forEach((value, index) => {
            replacements[`hierarchy${index}`] = value;
        });
        labor_category.forEach((value, index) => {
            replacements[`labor_category${index}`] = value;
        });
        job_template.forEach((value, index) => {
            replacements[`job_template${index}`] = value;
        });
        worker_type.forEach((value, index) => {
            replacements[`worker_type${index}`] = value;
        });
        worker_classification.forEach((value, index) => {
            replacements[`worker_classification${index}`] = value;
        });
        rate_type.forEach((value, index) => {
            replacements[`rate_type${index}`] = value;
        });

        const data = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT,
        });

        if (data.length > 0) {
            return reply.status(200).send({
                status_code: 200,
                message: 'Vendor markups fetched successfully.',
                trace_id: traceId,
                data: data,
            });
        } else {
            return reply.status(200).send({
                status_code: 200,
                message: "No records found.",
                trace_id: traceId,
                data: []
            });
        }
    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            message: "Error while fetching vendor markup.",
            trace_id: traceId,
            error: error.message
        });
    }
}