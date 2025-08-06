
import axios from 'axios';
import { databaseConfig } from '../config/db';
const sourcing_url = databaseConfig.config.sourcing_url;

export const updateJob = async (
  id: string,
  program_id: string,
  status: string,
  token: string
): Promise<any> => {
  try {
    const response = await axios.put(
      `${sourcing_url}/v1/api/program/${program_id}/job/${id}`,
      { status: status, updated_on: Date.now() },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    console.log('Job status updated successfully:', response);
    return response.data;
  } catch (error: any) {
    console.log(error.message);
  }
};


export default updateJob;
