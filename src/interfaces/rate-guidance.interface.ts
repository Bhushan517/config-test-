
export interface RateGuidanceEventPayload {
  event_name: string;
  is_enabled: boolean;
}

export interface RateGuidanceInput {
  rate_guidance_id: string;
  is_enabled?: boolean;
  rate_guidance: RateGuidanceEventPayload[];
}   
