import { FastifyRequest, FastifyReply } from "fastify";
import candidateModel from "../models/candidate.model";
import candidateInterface, { TenantInterface } from "../interfaces/candidate.Interface"
import generateCustomUUID from "../utility/genrateTraceId";
import { baseSearch } from "../utility/baseService";
import countriesModel from "../models/countries.model";
import { logger } from '../utility/loggerService';
import { decodeToken } from '../middlewares/verifyToken';
import { ProgramVendor } from "../models/program-vendor.model";
import { Op, QueryTypes } from "sequelize";
import { CandidateCodeGenerate, CandidateUniqueIdGenerate } from "../utility/code-genrate-service";
import { fetchSubmittedCandidate, fetchUnavailableCandidates } from "../utility/submission-candidate";
import User from "../models/user.model";
import Qualifications from "../models/qualifications.model";
import QualificationTypeModel from "../models/qualification-type-model";
import CandidateRepository from "../utility/candidate-query";
import JobCategoryModel from "../models/job-category.model";
import { sequelize } from "../config/instance";
import { createCandidateHistory } from "../utility/candidate-history";
import CandidateCustomFieldModel from "../models/cadidate-custom-field.model";
import { getCustomsField } from "../utility/get-custom-field";
import { parseValue } from "../utility/parse-value";
import IndustriesModel from "../models/labour-category.model";
import JobTemplateModel from "../models/job-template.model";
const candidateRepository = new CandidateRepository();

export async function createCandidate(request: FastifyRequest, reply: FastifyReply) {
    const { candidate, tenant } = request.body as { candidate: candidateInterface, tenant: TenantInterface };
    const { id, program_id, email } = candidate;

    const vendor = await ProgramVendor.findOne({
        where: {
            program_id: program_id,
            tenant_id: tenant.tenantId
        },
    });

    const vendor_id = vendor?.id || null;

    const traceId = generateCustomUUID();

    const user = request?.user;
    const userId = user?.sub;
    try {
        if (!id && email) {
            const existingCandidate = await candidateModel.findOne({
                where: {
                    vendor_id,
                    email,
                    is_deleted: false
                }
            });

            if (existingCandidate) {
                return reply.status(200).send({
                    status_code: 200,
                    message: "Candidate with the same email already exists in this program",
                    candidate: {},
                    trace_id: traceId,
                });
            }
        }
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "creating candidate",
                status: "success",
                description: `Creating candidate for ${program_id}`,
                level: 'info',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            candidateModel
        );
        console.log("******************")
        const candidateId = id ? candidate.candidate_id : await CandidateCodeGenerate(vendor_id, program_id);
        const [candidateData]: any = await candidateModel.upsert({
            ...candidate,
            vendor_id: vendor_id,
            candidate_id: candidateId,
            created_by: userId,
            updated_by: userId,
        });
        console.log("candidateId:-", candidateId)

        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create candidate",
                status: "success",
                description: `Create candidate for ${program_id} successfully: ${candidateData.id}`,
                level: 'success',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            candidateModel
        );
        console.log("Candidate :-")
        return reply.status(201).send({
            status_code: 201,
            message: "Candidate Created Successfully",
            candidate: candidateData?.id,
            trace_id: traceId,
        });
    } catch (error: any) {
        logger(
            {
                trace_id: traceId,
                actor: {
                    user_name: user?.preferred_username,
                    user_id: user?.sub,
                },
                data: request.body,
                eventname: "create candidate",
                status: "error",
                description: `error to create candidate for ${program_id}`,
                level: 'error',
                action: request.method,
                url: request.url,
                entity_id: program_id,
                is_deleted: false
            },
            candidateModel
        );

        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Failed To Create Candidate",
            error: (error as Error).message,
        });
    }
}

export async function getAllCandidate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    const user = request?.user;
    try {
        const { program_id } = request.params as { program_id: string };
        const {
            page = "1",
            limit = "10",
            sort = "desc",
            candidate_id,
            vendor_id,
            first_name,
            middle_name,
            last_name,
            name,
            job_title,
            is_active,
            worker_type_id,
            availability_date,
            unique_id,
            country_name,
            vendor_name,
            updatedAt,
            available_candidate,
            job_id,
            ...filters
        } = request.query as any;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        let order: [string, string][] = [["updated_on", "DESC"]];

        if (sort === "asc") {
            order = [["updated_on", "ASC"]];
        } else if (sort === "desc") {
            order = [["updated_on", "DESC"]];
        }

        const whereClause: any = {
            program_id,
            is_deleted: false,
            ...filters
        };

        if (candidate_id) whereClause.candidate_id = candidate_id;
        if (vendor_id) whereClause.vendor_id = vendor_id;
        if (first_name) whereClause.first_name = { [Op.like]: `%${first_name}%` };
        if (name) whereClause.name = { [Op.like]: `%${name}%` };
        if (middle_name) whereClause.middle_name = { [Op.like]: `%${middle_name}%` };
        if (last_name) whereClause.last_name = { [Op.like]: `%${last_name}%` };
        if (job_title) whereClause.job_title = { [Op.like]: `%${job_title}%` };
        if (is_active !== undefined) whereClause.is_active = is_active === 'true';
        if (worker_type_id) whereClause.worker_type_id = worker_type_id;
        if (availability_date) whereClause["preferences.availability_date"] = availability_date;
        if (updatedAt) whereClause.updatedAt = updatedAt;
        if (available_candidate === "true" && job_id) {
            try {
                const unavailableCandidateIds = await fetchUnavailableCandidates(
                    program_id,
                    job_id,
                    user,
                    traceId
                );
                whereClause.id = { [Op.notIn]: unavailableCandidateIds };
            } catch (error: any) {
                return reply.status(500).send({
                    status_code: 500,
                    trace_id: traceId,
                    message: "Error fetching unavailable candidates from sourcing service",
                    error: error.message,
                });
            }
        }

        const candidates = await candidateModel.findAll({
            where: whereClause,
            attributes: [
                'id', 'first_name', 'middle_name', 'last_name', 'is_active', 'name', 'email', 'tenant_id', 'vendor_id', "contacts",
                'candidate_id', 'preferences', 'worker_type_id', 'job_title', 'birth_date', 'updated_on', "state_national_id", "do_not_rehire_notes", "do_not_rehire_reason", "do_not_rehire"
            ],
            limit: limitNum,
            offset,
            order
        });
        const vendorIds = candidates.map((cand: any) => cand.vendor_id);

        const vendors = await ProgramVendor.findAll({
            where: {
                program_id,
                id: { [Op.in]: vendorIds },
                ...(vendor_name && { display_name: { [Op.like]: `%${vendor_name}%` } })
            },
            attributes: ['id', 'vendor_name', 'display_name', 'tenant_id']
        });
        const formattedCandidates = candidates.map((cand: any) => {
            const vendor = vendors.find((vend: any) => vend.id === cand.vendor_id);
            return {
                id: cand.id,
                first_name: cand.first_name,
                middle_name: cand.middle_name,
                last_name: cand.last_name,
                name: cand.name,
                birth_date: cand.birth_date,
                is_active: cand.is_active,
                candidate_id: cand.candidate_id,
                preferences: cand.preferences,
                worker_type_id: cand.worker_type_id,
                job_title: cand.job_title,
                email: cand.email,
                vendor_id: cand.vendor_id,
                vendor: vendor ? {
                    id: vendor.id,
                    vendor_name: vendor.vendor_name,
                    display_name: vendor.display_name,
                    tenant_id: vendor.tenant_id
                } : null,
                updated_on: cand.updated_on,
                state_national_id: cand.state_national_id,
                do_not_rehire_notes: cand.do_not_rehire_notes,
                do_not_rehire_reason: cand.do_not_rehire_reason,
                do_not_rehire: cand.do_not_rehire,
                phone_number: cand.contacts[0]?.number
            };
        });

        const count = await candidateModel.count({
            where: whereClause
        });

        return reply.status(200).send({
            status_code: 200,
            message: "Candidates fetched successfully",
            items_per_page: limitNum,
            total_candidates: count,
            candidates: formattedCandidates,
            trace_id: traceId,
        });

    } catch (error: any) {
        console.error("Error fetching candidates:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}



export async function getCandidateByIdAndProgramId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const candidate = await candidateModel.findOne({
            where: {
                id,
                program_id,
                is_deleted: false
            },
            attributes: {
                exclude: ['country_id']
            },
            include: [
                {
                    model: IndustriesModel,
                    as: 'labour_category',
                    attributes: ['id', 'name'],
                },
                 {
                    model: JobTemplateModel,
                    as: 'job_templates',
                    attributes: ['id', 'template_name'],
                },
                {
                    model: countriesModel,
                    as: 'country',
                    attributes: ['id', 'name', 'isd_code', 'iso_code_2', 'iso_code_3', 'min_phone_length', 'max_phone_length'],
                }
            ]
        });

        if (!candidate) {
            return reply.status(200).send({
                status_code: 200,
                trace_id: traceId,
                message: "Candidate not found!",
                candidate: []

            });
        }

        const candidateData = candidate.toJSON();
        console.log(candidateData, "candidateData")

        if (candidateData.labour_category) {
            candidateData.job_category = {
                id: candidateData.labour_category.id,
                name: candidateData?.labour_category?.name
            };
            delete candidateData.labour_category;
        }
         if (candidateData.job_templates) {
            candidateData.job_title = {
                id: candidateData?.job_templates?.id,
                name: candidateData?.job_templates?.template_name
            };
            delete candidateData.job_templates;
        }

        const vendor = await ProgramVendor.findOne({
            where: { id: candidateData.vendor_id, program_id: program_id },
            attributes: [['display_name', 'vendor_name',], "id", "tenant_id"]
        });

        if (vendor) {
            candidateData.vendor = vendor.toJSON();
        }

        let qualificationsData =
            typeof candidateData.qualifications === 'string'
                ? JSON.parse(candidateData.qualifications)
                : candidateData.qualifications || [];

        if (!Array.isArray(qualificationsData)) {
            qualificationsData = [];
        }

        const qualificationIds: string[] = [];
        const qualificationTypeIds: string[] = [];

        qualificationsData.forEach((item: any) => {
            if (item.qualifications && Array.isArray(item.qualifications)) {
                qualificationIds.push(...item.qualifications.map((q: any) => q.id));
            }
            if (item.qualification_type_id) {
                qualificationTypeIds.push(item.qualification_type_id);
            }
        });

        const qualifications = qualificationIds.length > 0
            ? await Qualifications.findAll({
                where: { id: qualificationIds },
                attributes: ['id', 'name'],
            })
            : [];

        const qualificationTypes = qualificationTypeIds.length > 0
            ? await QualificationTypeModel.findAll({
                where: { id: qualificationTypeIds },
                attributes: ['id', 'name'],
            })
            : [];

        qualificationsData.forEach((item: any) => {
            const typeMatch = qualificationTypes.find((type: any) => type.id === item.qualification_type_id);
            item.qualification_type_name = typeMatch ? typeMatch.name : null;

            if (item.qualifications && Array.isArray(item.qualifications)) {
                item.qualifications = item.qualifications.map((q: any) => {
                    const match = qualifications.find((qual: any) => qual.id === q.id);
                    return { ...q, name: match ? match.name : null };
                });
            } else {
                item.qualifications = [];
            }
        });

        const [customFields] = await sequelize.query(
            getCustomsField(candidateData.id, 'candidate_custom_fields', 'candidate_id', 'customfield_id'),
            {
                replacements: { id: candidateData.id },
                type: QueryTypes.SELECT
            }
        ) as any;
        customFields.custom_fields = customFields.custom_fields.map((field: any) => ({
            ...field,
            value: parseValue(field.value),
        }));
        // const workerClassification = await getSubmissionCandidate(program_id, id, token)
        return reply.status(200).send({
            status_code: 200,
            message: "Candidate fetched successfully",
            candidate: {
                ...candidateData,
                qualifications: qualificationsData,
                custom_fields: customFields?.custom_fields || [],
                // worker_classification: workerClassification.submission_candidate.worker_classification,
            },
            trace_id: traceId,
        });

    } catch (error: any) {
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

export async function updateCandidateByIdAndProgramId(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const traceId = generateCustomUUID();
    try {
        const { program_id, id } = request.params as { program_id: string, id: string };
        const { custom_fields, ...updates } = request.body as candidateInterface;
        // const user = request?.user;
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
        let existingRecord: any;
        if (updates.email) {
            const records = await candidateModel.findAll({
                where: {
                    program_id,
                    is_deleted: false,
                    [Op.or]: [
                        { id },
                        { email: updates.email }
                    ]
                }
            });

            existingRecord = records.find((r: any) => r.id === id);

            if (!existingRecord) {
                return reply.status(404).send({
                    status_code: 404,
                    trace_id: traceId,
                    message: "Candidate not found"
                });
            }

            const duplicateCandidate = records.find((r: any) =>
                r.email === updates.email &&
                r.id !== id &&
                r.vendor_id === existingRecord.vendor_id
            );

            if (duplicateCandidate) {
                return reply.status(409).send({
                    status_code: 409,
                    trace_id: traceId,
                    message: "Email already exists for another candidate in the same vendor.",
                });
            }
        }



        let uniqueId = await CandidateUniqueIdGenerate(program_id, updates);
        const [updatedRows] = await candidateModel.update(
            { ...updates, updated_by: userId, updated_on: Date.now(),unique_id: uniqueId },
            {
                where: {
                    program_id,
                    id,
                    is_deleted: false
                }
            });
        if (updatedRows === 0) {
            return reply.status(404).send({
                status_code: 404,
                trace_id: traceId,
                message: "Candidate not found",
            });
        }
        const updatedRecord = await candidateModel.findOne({
            where: {
                program_id,
                id,
                is_deleted: false
            }
        });

        if (Array.isArray(custom_fields)) {
            await CandidateCustomFieldModel.destroy({ where: { candidate_id: updatedRecord?.id } });
            const customField = custom_fields.map((field: { id: string; value: any }) => ({
                program_id,
                customfield_id: field.id,
                value: field.value,
                candidate_id: updatedRecord?.id,
            }));
            await CandidateCustomFieldModel.bulkCreate(customField);
        }
        createCandidateHistory(program_id, authHeader, existingRecord?.dataValues, updatedRecord?.dataValues, "Candidate Profile Updated")
            .catch(error => {
                console.error("Failed to create candidate history:", error);
            });
        return reply.status(200).send({
            status_code: 200,
            message: "Candidate updated successfully",
            record: updatedRecord,
            trace_id: traceId,
        });
    } catch (error) {
        console.error("Error updating candidate:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
        });
    }
}

export async function candidateSearch(request: FastifyRequest, reply: FastifyReply) {
    const searchFields = ['first_name', 'primary_email'];
    const responseFields = ['first_name', 'primary_email'];
    return baseSearch(request, reply, candidateModel, searchFields, responseFields);
}

export async function getCandidates(request: FastifyRequest, reply: FastifyReply) {
    const traceId = generateCustomUUID();
    const user = request?.user;
    const userId = user?.sub;
    const { program_id } = request.params as { program_id: string };
    const {
        page = "1",
        limit = "10",
        sort = "desc",
        candidate_id,
        first_name,
        middle_name,
        last_name,
        name,
        job_title,
        is_active,
        worker_type_id,
        availability_date,
        updatedAt,
        is_talent_pool,
        job_id,
        vendor_name,
        updated_on,
        search,
        ...filters
    } = request.query as any;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const workerTypeIds = worker_type_id ? worker_type_id.split(",") : [];
    let userData: any;
    if (!user?.userType) {
        userData = await User.findOne({
            where: { program_id: program_id, user_id: userId },
            attributes: ['id', 'program_id', 'tenant_id', 'user_type', 'is_all_hierarchy_associate', 'associate_hierarchy_ids']
        });
    }

    const vendorId = userData?.tenant_id ?? undefined;
    const user_type = userData?.user_type ?? undefined;
    let isMsp = false;
    let is_all_hierarchy_associate = false;
    let associate_hierarchy_ids: string[] = [];

    if (user_type === 'msp') {
        isMsp = true;
        is_all_hierarchy_associate = userData?.is_all_hierarchy_associate ?? false;
        associate_hierarchy_ids = userData?.associate_hierarchy_ids ?? [];
    }

    if (user?.userType === 'super_user' || user_type === 'client' || user_type === 'msp') {
        const replacements = {
            program_id,
            limit: limitNum,
            offset,
            candidate_id: candidate_id ? `%${candidate_id}%` : undefined,
            first_name: first_name ? `%${first_name}%` : undefined,
            middle_name: middle_name ? `%${middle_name}%` : undefined,
            last_name: last_name ? `%${last_name}%` : undefined,
            job_title: job_title ? `%${job_title}%` : undefined,
            is_active: is_active !== undefined ? is_active === 'true' : undefined,
            worker_type_id: workerTypeIds,
            availability_date: availability_date ? parseInt(availability_date, 10) : undefined,
            updated_on: updated_on ? updated_on : undefined,
            search: search ? `%${search}%` : null,
            isMsp,
            is_all_hierarchy_associate,
            associate_hierarchy_ids
        };

        const { count, candidates } = await candidateRepository.getCandidatesWithFilters(replacements);

        return reply.status(200).send({
            status_code: 200,
            trace_id: traceId,
            message: candidates.length ? "Candidates retrieved successfully." : "Candidates not found.",
            items_per_page: limitNum,
            total_candidates: count,
            candidates
        });
    }

    const vendor = await ProgramVendor.findOne({
        where: {
            program_id: program_id,
            tenant_id: vendorId
        },
        plain: true
    });

    const vendor_id = vendor?.id ?? null;

    if (vendorId === undefined) {
        return reply.status(200).send({
            status_code: 200,
            message: "Only vendor have permission to see candidates!",
            candidates: [],
            trace_id: traceId,
        });
    }

    const whereClause: any = {
        vendor_id: vendor_id,
        is_deleted: false,
        ...filters
    };

    if (candidate_id) whereClause.candidate_id = { [Op.like]: `%${candidate_id}%` };
    if (first_name) {
        const nameParts = first_name.trim().split(/\s+/);

        let nameFilter: any[] = [
            { first_name: { [Op.like]: `%${first_name}%` } },
            { last_name: { [Op.like]: `%${first_name}%` } }
        ];

        if (nameParts.length > 1) {
            nameFilter.push({
                [Op.and]: [
                    { first_name: { [Op.like]: `%${nameParts[0]}%` } },
                    { last_name: { [Op.like]: `%${nameParts.slice(1).join(' ')}%` } }
                ]
            });
        }

        if (!whereClause[Op.or]) {
            whereClause[Op.or] = nameFilter;
        } else {
            whereClause[Op.or] = [...whereClause[Op.or], ...nameFilter];
        }
    }
    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (middle_name) whereClause.middle_name = { [Op.like]: `%${middle_name}%` };
    if (last_name) whereClause.last_name = { [Op.like]: `%${last_name}%` };
    if (job_title) whereClause.job_title = { [Op.like]: `%${job_title}%` };
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (worker_type_id) whereClause.worker_type_id = { [Op.in]: workerTypeIds };
    if (availability_date) whereClause["preferences.availability_date"] = availability_date;
    if (updatedAt) whereClause.updatedAt = updatedAt;
    if (search) {
        whereClause[Op.or] = [
            { first_name: { [Op.like]: `%${search}%` } },
            { last_name: { [Op.like]: `%${search}%` } },
            sequelize.where(
                sequelize.fn('concat',
                    sequelize.col('first_name'), ' ',
                    sequelize.col('last_name')
                ),
                { [Op.like]: `%${search}%` }
            )
        ];
    }

    if (is_talent_pool === "true" && job_id) {
        try {
            const submitCandidateIds = await fetchSubmittedCandidate(job_id, user, vendor_id);
            whereClause.id = { [Op.notIn]: submitCandidateIds };
        } catch (error: any) {
            return reply.status(500).send({
                status_code: 500,
                trace_id: traceId,
                message: "Error fetching submitted candidates from sourcing service",
                error: error.message,
            });
        }
    }

    try {
        const candidates = await candidateModel.findAll({
            where: whereClause,
            attributes: [
                'id', 'first_name', 'middle_name', 'last_name', 'is_active', 'name', 'email', 'tenant_id', "contacts",
                'candidate_id', 'preferences', 'vendor_id', 'worker_type_id', 'job_title', 'birth_date', 'updated_on', "state_national_id", "do_not_rehire_notes", "do_not_rehire_reason", "do_not_rehire", "is_pre_identified",
            ],
            limit: limitNum,
            offset,
            order: [['updated_on', 'DESC']]
        });

        const vendorIds = candidates.map((cand: any) => cand.vendor_id);
        const vendors = await ProgramVendor.findAll({
            where: {
                id: { [Op.in]: vendorIds },
                program_id: program_id,
                ...(vendor_name && { display_name: { [Op.like]: `%${vendor_name}%` } })
            },
            attributes: ['id', 'vendor_name', 'display_name', 'tenant_id']
        });

        const formattedCandidates = candidates.map((cand: any) => {
            const vendor = vendors.find((vend: any) => vend.id === cand.vendor_id);
            return {
                id: cand.id,
                first_name: cand.first_name,
                middle_name: cand.middle_name,
                last_name: cand.last_name,
                name: cand.name,
                birth_date: cand.birth_date,
                is_active: cand.is_active,
                candidate_id: cand.candidate_id,
                preferences: cand.preferences,
                worker_type_id: cand.worker_type_id,
                job_title: cand.job_title,
                email: cand.email,
                vendor: vendor ? {
                    id: vendor.id,
                    vendor_name: vendor.vendor_name,
                    display_name: vendor.display_name
                } : null,
                updated_on: cand.updated_on,
                state_national_id: cand.state_national_id,
                do_not_rehire_notes: cand.do_not_rehire_notes,
                do_not_rehire_reason: cand.do_not_rehire_reason,
                do_not_rehire: cand.do_not_rehire,
                phone_number: cand.contacts[0]?.number,
                is_pre_identified: cand.is_pre_identified
            };
        });

        const count = await candidateModel.count({
            where: whereClause
        });

        return reply.status(200).send({
            status_code: 200,
            message: "Candidates fetched successfully",
            items_per_page: limitNum,
            total_candidates: count,
            candidates: formattedCandidates,
            trace_id: traceId,
        });

    } catch (error: any) {
        console.error("Error fetching candidates:", error);
        return reply.status(500).send({
            status_code: 500,
            trace_id: traceId,
            message: "Internal Server Error",
            error: error.message
        });
    }
}