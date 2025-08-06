import { QueryTypes } from "sequelize";
import { sequelize } from "../config/instance";
class MtpRepository {
    
    async programQuery(program_id: string): Promise<{
        unique_id: string; name: string
      }[]> {
        const query = `
                SELECT 
                    programs.name,
                    programs.unique_id
                FROM programs
                WHERE programs.id = :program_id;
            `;
    
        const data = await sequelize.query<{ name: string, unique_id: string }>(query, {
          replacements: { program_id },
          type: QueryTypes.SELECT,
        });
    
        return data;
      }

async getAllMtpData(
  programId: string,
  limit: number,
  offset: number,
  talentName?: string,
  mtpId?: string,
  doNotRehire?: string,
  updatedOn?: string,
  linkedProfilesCount?: number
): Promise<{ data: any[]; count: number }> {
  const hasTalentName = talentName && talentName.trim() !== '';
  const hasMtpId = mtpId && mtpId.trim() !== '';
  const hasDoNotRehire = doNotRehire !== undefined;
  const hasUpdatedOn = updatedOn && updatedOn.trim() !== '';
  const hasLinkedProfilesCount = linkedProfilesCount !== undefined;

  let query = `
          SELECT 
            mtp.*, 
            c.do_not_rehire, 
            JSON_LENGTH(mtp.linked_profiles) AS linked_profiles_count,
            COUNT(*) OVER() AS total_count
          FROM mtp
          LEFT JOIN candidates c ON mtp.mtp_candidate_id = c.id
          WHERE mtp.program_id = :program_id
          AND mtp.is_deleted = false
        `;

  const replacements: any = {
    program_id: programId,
    limit,
    offset,
  };

  if (hasTalentName) {
    query += ` AND mtp.talent_name LIKE :talentNamePattern`;
    replacements.talentNamePattern = `%${talentName}%`;
  }

  if (hasMtpId) {
    query += ` AND mtp.mtp_id LIKE :mtpIdPattern`;
    replacements.mtpIdPattern = `%${mtpId}%`;
  }

  if (hasDoNotRehire) {
    query += ` AND c.do_not_rehire = :doNotRehire`;
    replacements.doNotRehire = doNotRehire === 'true'; 
  }

  if (hasUpdatedOn) {
    const updatedDate = new Date(Number(updatedOn));
    const formattedDate = updatedDate.toISOString().split('T')[0]; 
    query += ` AND DATE(FROM_UNIXTIME(mtp.updated_on / 1000)) = :updatedOn`;
    replacements.updatedOn = formattedDate;
  }

  if (hasLinkedProfilesCount) {
    query += ` AND JSON_LENGTH(mtp.linked_profiles) = :linkedProfilesCount`;
    replacements.linkedProfilesCount = Number(linkedProfilesCount);
  }

  query += ` LIMIT :limit OFFSET :offset`;

  const data = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });

  const count = data.length > 0 ? Number((data[0] as any).total_count) : 0;

  return { data, count };
}
        
      async getPossibleDuplicateCandidate(programId: string): Promise<any> {    
        const query = `
            SELECT 
                pdc.matching_profile AS candidate_id,
                pdc.program_id AS program_id
            FROM 
                possible_duplicate_candidate pdc
          
            WHERE 
                pdc.program_id = :program_id
        `;
    
        const result = await sequelize.query(query, {
            replacements: { program_id: programId},
            type: QueryTypes.SELECT,
            raw: true,
        });
    
        return result;
    }

    async getMtpById(programId: any, id: any,page?: number, limit?: number): Promise<any> {
      const usePagination = page !== undefined && limit !== undefined;
      const offset = usePagination ? (page - 1) * limit : 0;
      const query = `
       WITH linked_candidates AS (
          SELECT c.*
          FROM candidates c
          JOIN mtp m ON m.id = :id
          WHERE JSON_CONTAINS(m.linked_profiles, JSON_QUOTE(c.id), '$')
             OR m.mtp_candidate_id = c.id
        ),
        paginated_candidates AS (
          SELECT *
          FROM linked_candidates
          ${usePagination ? 'ORDER BY id LIMIT :limit OFFSET :offset' : ''}
        )

  SELECT 
    m.id,
    m.talent_name,
    m.updated_on,
    m.mtp_id,
    m.mtp_candidate_id,
    m.is_master_profile,
    (SELECT COUNT(*) FROM linked_candidates) AS linked_profiles_count,
JSON_ARRAYAGG(JSON_OBJECT(
          'mtp_candidate_id', pc.id,
          'program_id', pc.program_id,
          'vendor_id', pc.vendor_id,
          'candidate_id', pc.candidate_id,
          'birth_date', pc.birth_date,
          'address', pc.addresses,
          'email', pc.email,
          'first_name', pc.first_name,
          'last_name', pc.last_name,
          'middle_name', pc.middle_name,
          'contacts', pc.contacts,
          'do_not_rehire',pc.do_not_rehire,
          'do_not_rehire_notes',pc.do_not_rehire_notes,
          'do_not_rehire_reason',rc.name,
          'vendor', JSON_OBJECT(
          'vendor_id', pc.vendor_id,
          'vendor_name', pv.display_name
          )
        )) AS linked_profiles
  FROM 
    mtp m
LEFT JOIN paginated_candidates pc ON TRUE
LEFT JOIN program_vendors pv ON pv.id = pc.vendor_id
LEFT JOIN reason_codes rc ON rc.id = pc.do_not_rehire_reason
  WHERE 
    m.program_id = :program_id
    AND m.id = :id
    AND m.is_deleted = false
`;

const replacements: any = {
  program_id: programId,
  id,
};

if (usePagination) {
  replacements.limit = limit;
  replacements.offset = offset;
}
const result = await sequelize.query(query, {
  replacements,
  type: QueryTypes.SELECT,
  raw: true,
});
        console.log("mtpDtata",result)
      return result;
  }

  async getCandidate(programId: string,candidateId:any): Promise<any> {
    const query =`
        SELECT 
            MIN(c.candidate_id) AS candidate_id,
            MIN(c.program_id) AS program_id,
            CONCAT(MIN(c.first_name), ' ', MIN(c.last_name)) AS candidate_name
        FRom 
            candidates c             
        WHERE 
            c.program_id = :program_id
            AND c.id = :candidate_id;
    `;

    const result = await sequelize.query(query, {
        replacements: { program_id:programId,candidate_id:candidateId},
        type: QueryTypes.SELECT,
        raw: true,
    });
    return result;
}

async getAllMtp(programId: string): Promise<any> {
    const query = `
        SELECT 
            s.mtp_candidate_id AS candidate_id
        FROM 
            mtp s
        WHERE s.program_id = :program_id
    `;

    const result = await sequelize.query(query, {
        replacements: { program_id: programId },
        type: QueryTypes.SELECT,
        raw: true,
    });
    return result; 
}

async getMtpByLinkedProfile(programId: string,linkedProfileId:any): Promise<any> {
  const query = `
      SELECT 
          s.linked_profiles AS candidate_id
      FROM 
          mtp s
      WHERE s.program_id = :program_id
      AND s.linked_profiles=:linkedProfileId
  `;

  const result = await sequelize.query(query, {
      replacements: { program_id: programId,linked_profiles:linkedProfileId },
      type: QueryTypes.SELECT,
      raw: true,
  });
  return result; 
}

async getLinkProfiles(programId: any, mtpCandidateId: any): Promise<any> {
  const query = `
    SELECT 
      m.id,
      m.talent_name,
      m.updated_on,
      m.mtp_id,
      m.mtp_candidate_id,
      JSON_OBJECT(
        'id', sc.id,
        'first_name', sc.first_name,
        'last_name', sc.last_name,
        'middle_name', sc.middle_name,
        'birth_date', sc.birth_date,
        'email', sc.email,
        'contacts', sc.contacts,
        'candidate_id', sc.candidate_id
      ) AS submission_candidate,
      COALESCE(
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'mtp_candidate_id', c2.id,
              'first_name', c2.first_name,
              'last_name', c2.last_name,
              'middle_name', c2.middle_name,
              'program_id', c2.program_id,
              'candidate_id', c2.candidate_id,
              'birth_date', c2.birth_date,
              'email', c2.email,
              'contacts', c2.contacts,
              'do_not_rehire', c2.do_not_rehire
            )
          )
          FROM candidates c2
          WHERE JSON_CONTAINS(m.linked_profiles, JSON_QUOTE(c2.id), '$')
            AND c2.id != :mtp_candidate_id
        ),
        JSON_ARRAY()
      ) AS linked_profiles

    FROM mtp m
    LEFT JOIN candidates sc 
      ON sc.id = :mtp_candidate_id
    WHERE 
      m.program_id = :program_id
      AND (
        m.mtp_candidate_id = :mtp_candidate_id
        OR JSON_CONTAINS(IFNULL(m.linked_profiles, '[]'), JSON_QUOTE(:mtp_candidate_id), '$')
      )

    GROUP BY 
      m.id, m.talent_name, m.updated_on, m.mtp_id, m.mtp_candidate_id, sc.id;
  `;

  const result = await sequelize.query(query, {
    replacements: { program_id: programId, mtp_candidate_id: mtpCandidateId },
    type: QueryTypes.SELECT,
    raw: true,
  });

  return result;
}

  }

  export default MtpRepository;