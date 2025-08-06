import { databaseConfig } from "../config/db";

const TEAI_SERVICE_URL = databaseConfig.config.teai_url;

export async function updateDoNotRehireForCandidateWorkers(
  candidateId: string,
  doNotRehire: boolean,
  programId: string,
  authHeader: string
) {
  try {
    const workers = await getWorkersByCandidate(candidateId, authHeader, programId);
    console.log(`getWorkers`, workers);
    await Promise.allSettled(
        workers.map((worker: { uuid: string }) =>
          updateWorkerStatus(worker.uuid, doNotRehire, programId, authHeader)
        )
      );
      
  } catch (err) {
    console.error(`Failed to update workers for candidate ${candidateId}:`, err);
  }
}

export async function getWorkersByCandidate(
    candidateId: string,
    authHeader: string,
    programId: string
  ): Promise<{ uuid: string }[]> {
    const url = `${TEAI_SERVICE_URL}/teai/worker/v1/program/${programId}/assignment/candidate/${candidateId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });
  
    const result = await response.json();
    console.log(`Workers fetched for candidate ${candidateId}:`, result);
  
    if (!result) return [];
  
    return Array.isArray(result) ? result : [result];
  }
  

export async function updateWorkerStatus(
  uuid: string,
  doNotRehire: boolean,
  programId: string,
  authHeader: string
) {
  const url = `${TEAI_SERVICE_URL}/teai/worker/v1/program/${programId}/worker/${uuid}`;
  const payload = { do_not_rehire: doNotRehire };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Failed to update worker ${uuid}:`, await response.text());
  }
}
