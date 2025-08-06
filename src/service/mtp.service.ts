import { FastifyRequest } from "fastify";
import MtpModel from "../models/mtp.model";
import { MtpInterface } from "../interfaces/mtp.interface";
import MtpRepository from "../repositories/mtp.repository";
import { findDuplicateCandidate } from "../utility/create-candidate";
import { logger } from "../utility/loggerService";
import { sequelize } from "../config/instance";
import DisebleMtp from "../models/disable_mtp.model";
import { Op } from "sequelize";
import Candidate from "../models/candidate.model";
import { updateDoNotRehireForCandidateWorkers } from "../utility/update-worker";

class MtpService {
    private mtpRepository: MtpRepository;

    constructor() {
        this.mtpRepository = new MtpRepository();
    }


    async createMtp({
        programId,
        mtp,
        userId,
        token,
        request,
        traceId,
        user
      }: {
        programId: string;
        mtp: MtpInterface;
        userId: string;
        token: string;
        request: FastifyRequest;
        traceId: string;
        user: any;
      }) {
        const mtpCandidateId = mtp.mtp_candidate_id;
      
        const getCandidateData = await this.mtpRepository.getCandidate(programId, mtpCandidateId);
        const talentName = getCandidateData?.[0]?.candidate_name;
      
        const payload = {
          ...mtp,
          talent_name: talentName
        };
      
        const existingMtpData = await this.mtpRepository.getAllMtp(programId);
        console.log("existingMtpData", existingMtpData);
      
        if (!existingMtpData || existingMtpData.length === 0) {
          const created = await this.createNewMtp(mtp, talentName, userId, request, traceId, user);
          return {
            statusCode: 201,
            message: "No existing MTP data found. New MTP created successfully.",
            data: created
          };
        }
      
        const talentCandidateIds = existingMtpData.reduce((acc: string[], row: any) => {
          return acc.concat(row.candidate_id);
        }, []);
       console.log("talentCandidateIds",talentCandidateIds)
       console.log("mtpCandidateId",mtpCandidateId)

        if (talentCandidateIds) {
            
            console.log("new ntp candidate id",mtpCandidateId)
            console.log("mtp candidate ids",talentCandidateIds)
           findDuplicateCandidate(
            [...talentCandidateIds, mtpCandidateId],
            programId,
            userId,
            token,
            mtpCandidateId,
            payload
          );
      
          this.logEvent({
            request,
            traceId,
            user,
            userId,
            eventName: "create mtp",
            status: "skipped",
            description: `Duplicate detected. Added to possible duplicates. Candidate ID: ${mtpCandidateId}`,
            level: "warn"
          });
      
          return {
            statusCode: 200,
            message: "Duplicate detected. Added to possible duplicates.",
            data: null
          };
        }
      
        const created = await this.createNewMtp(mtp, talentName, userId, request, traceId, user);
        return {
          statusCode: 201,
          message: "New MTP created successfully.",
          data: created
        };
      }
      

    /**
     * Helper method to create a new MTP
     */
    private async createNewMtp(
        mtp: MtpInterface, 
        talentName: string, 
        userId: string, 
        request: FastifyRequest,
        traceId: string,
        user: any
    ) {
        const mtpData = await MtpModel.create({
            ...mtp,
            talent_name: talentName,
            created_by: userId,
            updated_by: userId,
        });
        
        this.logEvent({
            request,
            traceId,
            user,
            userId,
            data: request.body,
            eventName: "create mtp",
            status: "success",
            description: `MTP created successfully: ${mtpData.id}`,
            level: "success"
        });
        
        return {
            statusCode: 200,
            message: "MTP created successfully",
            data: mtpData
        };
    }


    async getAllMtp({
        programId,
        page = 1,
        limit = 10,
        talentName,
        mtpId,
        doNotRehire,
        updatedOn,
        linkedProfiles
    }: {
        programId: string;
        page?: number;
        limit?: number;
        talentName?: string;
        mtpId?: string;
        doNotRehire?: string;
        updatedOn?: any;
        linkedProfiles?: number;
    }) {
        const offset = (page - 1) * limit;

        const { data: mtpData, count } = await this.mtpRepository.getAllMtpData(
            programId,
            limit,
            offset,
            talentName,
            mtpId,
            doNotRehire,
            updatedOn,
            linkedProfiles
        );

        return {
            message: mtpData.length > 0
                ? 'MTP data fetched successfully.'
                : 'No matching records found.',
            data: mtpData,
            pagination: {
                page,
                limit,
                total_count: count,
                total_pages: Math.ceil(count / limit),
            }
        };
    }


    async getMtpById(programId: string, id: string, limit?: number, offset?: number) {
        const [mtpData] = await this.mtpRepository.getMtpById(programId, id,limit, offset);
        const hasData = mtpData && mtpData?.id;
       return {
       message: hasData ? "MTP data retrieved successfully." : "No matching records found.",
       data: hasData ? mtpData : {}
       };
    }


    async linkMtp({
        programId,
        id,
        mtpCandidateId,
        unlinkMtpId,
    }: {
        programId: string;
        id: string;
        mtpCandidateId: string[];
        unlinkMtpId?: string;
    }) {
        let transaction;
    
        try {
            transaction = await sequelize.transaction();
    
            const targetMtp = await MtpModel.findOne({
                where: { id, program_id: programId, is_deleted: false },
                transaction
            });
    
            if (!targetMtp) {
                return { statusCode: 404, message: "Target MTP not found" };
            }
    
            const currentLinks = Array.isArray(targetMtp.linked_profiles) ? targetMtp.linked_profiles : [];
    
            const newLinks = mtpCandidateId.filter(candidateId => !currentLinks.includes(candidateId));
            const updatedTargetLinks = [...currentLinks, ...newLinks];
    
            await MtpModel.update(
                { linked_profiles: updatedTargetLinks },
                { where: { id, program_id: programId }, transaction }
            );

           if (unlinkMtpId) {
            await MtpModel.findOne({
                where: { id: unlinkMtpId, program_id: programId, is_deleted: false },
                transaction
            });
        
            if (unlinkMtpId) {
                const unlinkMtp = await MtpModel.findOne({
                    where: { id: unlinkMtpId, program_id: programId, is_deleted: false },
                    transaction
                });
            
                if (unlinkMtp) {
                    const oldLinks = Array.isArray(unlinkMtp.linked_profiles) ? unlinkMtp.linked_profiles : [];
                    const candidatesToTransfer = mtpCandidateId.length === 0 ? oldLinks : mtpCandidateId;
            
                    const updatedOldLinks = oldLinks.filter(id => !candidatesToTransfer.includes(id));
                    await MtpModel.update(
                        { linked_profiles: updatedOldLinks },
                        { where: { id: unlinkMtpId, program_id: programId }, transaction }
                    );

                    const newLinksToAdd = candidatesToTransfer.filter(id => !updatedTargetLinks.includes(id));
                    updatedTargetLinks.push(...newLinksToAdd);
            
                    await MtpModel.update(
                        { linked_profiles: updatedTargetLinks },
                        { where: { id, program_id: programId }, transaction }
                    );

                     if (mtpCandidateId.length === 0 || updatedOldLinks.length === 0) {
                        await MtpModel.update(
                            { is_deleted: true },
                            { where: { id: unlinkMtpId, program_id: programId }, transaction }
                        );
                    }
                }
            }
            
        }
        
            await transaction.commit();
    
            return {
                statusCode: 200,
                message: "MTP candidates linked successfully"
            };
    
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    }
    
    
    async unlinkMtp({
        programId,
        id,
        mtpCandidateIds,
        user,
        traceId
    }: {
        programId: string;
        id: string;
        mtpCandidateIds: string[]; 
        user: any;
        traceId: string;
    }) {
        const userId = user?.sub;
        let transaction;
    
        try {
            const mtp = await MtpModel.findOne({
                where: { id, program_id: programId }
            });
           console.log("mtp",mtp)
            if (!mtp) {
                return {
                    statusCode: 404,
                    message: "MTP not found"
                };
            }
    
            const currentLinks = Array.isArray(mtp.linked_profiles) ? mtp.linked_profiles : [];
            const notLinked = mtpCandidateIds.filter(cid => !currentLinks.includes(cid));
           
            transaction = await sequelize.transaction();
            const updatedLinks = currentLinks.filter(cid => !mtpCandidateIds.includes(cid));
            await MtpModel.update(
                { linked_profiles: updatedLinks },
                {
                    where: { id, program_id: programId },
                    transaction
                }
            );
    
            for (const candidateId of mtpCandidateIds) {
                const existing = await MtpModel.findOne({
                    where: { mtp_candidate_id: candidateId, program_id: programId },
                    transaction
                });
    
                if (existing) {
                    await existing.update({ is_deleted: false,linked_profiles:[candidateId] }, { transaction });
                } else {
                    const candidateData = await this.mtpRepository.getCandidate(programId, candidateId);
                    const talentName = candidateData?.[0]?.candidate_name;
                    
                    await MtpModel.create({
                        program_id: programId,
                        mtp_candidate_id: candidateId,
                        is_deleted: false,
                        linked_profiles: [candidateId],
                        talent_name: talentName,
                        created_by: userId,
                        updated_by: userId,
                        trace_id: traceId
                    }, { transaction });
                }
            }
    
            await transaction.commit();
    
            return {
                statusCode: 200,
                message: "MTP candidates unlinked and created successfully"
            };
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            throw error;
        }
    }
    

    async getLinkedProfiles(programId: string, mtpCandidateId: string) {
        const [mtpData] = await this.mtpRepository.getLinkProfiles(programId, mtpCandidateId);
        console.log("mtpData", mtpData);
      
        if (!mtpData) {
          return {
            message: "No matching records found.",
            data: []
          };
        }
      
        const uniqueMtpCandidates = Array.isArray(mtpData.mtp_candidates)
          ? Object.values(
              mtpData.mtp_candidates.reduce((acc: { [x: string]: any; }, candidate: { mtp_id: string | number; }) => {
                acc[candidate.mtp_id] = candidate;
                return acc;
              }, {} as Record<string, typeof mtpData.mtp_candidates[0]>)
            )
          : [];
      
        const resultData = {
          ...mtpData,
          mtp_candidates: uniqueMtpCandidates
        };
      
        return {
          message: "Linked profile data retrieved successfully.",
          data: resultData
        };
      }
      
      async disableMtp({
        mtpId,  
        programId,
        candidateId,
        traceId,
      }: {
        mtpId: string[];
        programId: string;
        candidateId: string;
        traceId: string;
      }) {
        
        const disableRecords = await DisebleMtp.bulkCreate(
            mtpId.map((id) => ({
              mtp_id: id,
              program_id: programId,
              candidate_id: candidateId,
            }))
        );

        return {
          statusCode: 200,
          message: "selected MTPs disabled successfully.",
          trace_id: traceId,
          data: disableRecords,
        };
      }
      
    async masterProfile({
        programId,
        id,
        mtpCandidateId,
        traceId
    }: {
        programId: string;
        id: string;
        mtpCandidateId: string;
        traceId: string;
    }) {
        let transaction;
    
        try {
            const mtp = await MtpModel.findOne({
                where: { id, program_id: programId, is_deleted: false }
            });
    
            if (!mtp) {
                return {
                    statusCode: 404,
                    message: "MTP not found"
                };
            }
    
            transaction = await sequelize.transaction();
            const getCandidateData = await this.mtpRepository.getCandidate(programId, mtpCandidateId);
            const talentName = getCandidateData?.[0]?.candidate_name;
    
           await MtpModel.update(
                {
                    mtp_candidate_id: mtpCandidateId,
                    is_master_profile: true,
                    talent_name:talentName
                },
                {
                    where: {
                        id,
                        program_id: programId,
                        is_deleted: false
                    },
                    transaction
                }
            );
    
            await transaction.commit();
    
            return {
                statusCode: 200,
                message: "Master profile created successfully! ",
                traceId
            };
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            throw error;
        }
    }
    
    async updateLinkedCandidatesDoNotRehire({
        programId,
        mtpId,
        doNotRehire,
        traceId,
        token
    }: {
        programId: string;
        mtpId: string;
        doNotRehire: boolean;
        traceId: string;
        token: any;
    }) {
        let transaction;
    
        try {
            transaction = await sequelize.transaction();
    
            const mtp = await MtpModel.findOne({
                where: { id: mtpId, program_id: programId, is_deleted: false },
                transaction
            });
    
            if (!mtp) {
                return {
                    statusCode: 404,
                    message: "MTP not found",
                    traceId
                };
            }
    
            const linkedProfiles: string[] = mtp.linked_profiles || [];
    
            if (!linkedProfiles.length) {
                return {
                    statusCode: 400,
                    message: "No linked profiles found in MTP",
                    traceId
                };
            }
            //     await Candidate.update(
            //     { do_not_rehire: doNotRehire },
            //     {
            //         where: {
            //             id: linkedProfiles,
            //             program_id: programId,
            //             is_deleted: false
            //         },
            //         transaction
            //     }
            // );
    
            await MtpModel.update(
                { do_not_rehire: doNotRehire },
                {
                    where: {
                        id: mtpId,
                        program_id: programId,
                        is_deleted: false
                    },
                    transaction
                }
            );
    
            await transaction.commit();

        //   await Promise.allSettled(
        //         linkedProfiles.map((candidateId) =>
        //           updateDoNotRehireForCandidateWorkers(candidateId, doNotRehire, programId, token)
        //         )
        //       );
            return {
                statusCode: 200,
                message: "do_not_rehire updated in MTP and linked candidates successfully",
                traceId
            };
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    }
    
    
    
    private logEvent({
        request,
        traceId,
        user,
        userId,
        data,
        eventName,
        status,
        description,
        level
    }: {
        request: FastifyRequest;
        traceId: string;
        user?: any;
        userId?: string;
        data?: any;
        eventName: string;
        status: string;
        description: string;
        level: string;
    }) {
        logger({
            trace_id: traceId,
            actor: userId ? {
                user_name: user?.preferred_username,
                user_id: userId,
            } : undefined,
            data: data || request.body,
            eventname: eventName,
            status: status,
            description: description,
            level: level,
            action: request.method,
            url: request.url,
            is_deleted: false,
        }, MtpModel);
    }
}



export default MtpService;