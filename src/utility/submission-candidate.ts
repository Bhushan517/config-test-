import axios from "axios";
import { databaseConfig } from '../config/db';
const sourcing_url = databaseConfig.config.sourcing_url;

export async function fetchUnavailableCandidates(
    program_id: string,
    job_id: string,
    token: any,
    traceId: string
): Promise<number[]> {
    try {
        const response = await axios.get(
            `${sourcing_url}/v1/api/program/${program_id}/submission-candidate`,
            {
                params: { job_id },
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        return response.data.submission_candidate.map((item: any) => item.candidate_id);
    } catch (error: any) {
        throw new Error(
            error.response?.data.message || "Failed to fetch unavailable candidates"
        );
    }
}

export async function fetchSubmittedCandidate(
    job_id: string,
    token: any,
    vendor_id: string
): Promise<any[]> {
    try {
        const response = await axios.get(
            `${sourcing_url}/v1/api/vendor/${vendor_id}/submission-candidates`,
            {
                params: { job_id },
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        // Extract submission_candidate_ids from response.data
        const submissionCandidateIds = response.data?.submission_candidate_ids;
        if (!submissionCandidateIds) {
            throw new Error("submission_candidate_ids not found in the response");
        }
        return submissionCandidateIds;
    } catch (error: any) {
        throw new Error(
            error.response?.data.message || "Failed to fetch unavailable candidates"
        );
    }
}

export async function getSubmissionCandidate(
    program_id: string,
    candidate_id: string,
    token: any,
): Promise<any> {
    try {
        const response = await axios.get(
            `${sourcing_url}/v1/api/program/${program_id}/get-submission-candidate/${candidate_id}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('response', response.data);
        return response.data
    } catch (error: any) {
        throw new Error(
            error.response?.data.message || "Failed to fetch unavailable candidates"
        );
    }
}