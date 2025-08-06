import axios from 'axios';
import { databaseConfig } from "../config/db";
import { handleErrorProperly } from './notification-helper';
const sourcing_url = databaseConfig.config.sourcing_url;
export const createJobHistory = async (
  program_id: string,
  job_id: string,
  status: string,
  event_type: string,
  token: string,
  userId: string,
  new_data?: Record<string, any>,
  old_data?: Record<string, any>
) => {
  try {
    console.log("Creating job history : ");

    const response = await axios.post(
      `${sourcing_url}/v1/api/program/${program_id}/job-history`,
      {
        job_id,
        status,
        event_type,
        new_data,
        old_data,
        user_id: userId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        family: 4 
      }
    );
    if (!response.data) {
      console.warn("Job history not created - empty response");
      return { status: 404, message: "Job history not created", data: null };
    }
    console.log("Response : ",response.data);
    
    return { status: 200, message: "Success", data: response.data };
  } catch (error: any) {
    console.error('Job history creation failed:', error.message);
    return handleErrorProperly(error, "Job history");
  }
};


export async function getUpdatedJobStatus(job_id: string, program_id: string, token: string): Promise<string | null> {
    try {
        const apiUrl = `${sourcing_url}/v1/api/program/${program_id}/job/${job_id}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token}`,
            },
        });

        const jobStatus = response?.data?.job?.status;

        if (!jobStatus) {
            console.warn(`Job status not found for job_id: ${job_id}`);
            return null;
        }

        return jobStatus;
    } catch (error) {
        console.error('Error fetching job status:', error);
        return null;
    }
}
