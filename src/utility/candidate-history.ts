import axios from 'axios';
import { databaseConfig } from "../config/db";
import { handleErrorProperly } from './notification-helper';
const sourcing_url = databaseConfig.config.sourcing_url;
console.log("sourcing_url : : :", sourcing_url)

export const createCandidateHistory = async (program_id: string, token: string, oldData: any, newData: any, action: any) => {

  try {
    const response = await axios.post(
      `${sourcing_url}/v1/api/program/${program_id}/candidate-history`,
      { oldData, newData, action },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${token}`
        }
      }
    );

    if (!response.data) {
      console.warn("Candidate details not found.");
      return { status: 404, message: "Candidate details not found", data: null };
    }

    console.log('Candidate details fetched successfully');
    return { status: 200, message: "Success", data: response.data };
  } catch (error: any) {
    return handleErrorProperly(error, "Candidate details");
  }
};
