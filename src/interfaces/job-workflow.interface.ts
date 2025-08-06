import { Json } from "sequelize/types/utils";

export interface JobWorkFlow {
  id: string,
  name: string,
  event_id: string,
  method_id: string,
  hierarchies: any[],
  flow_type?:any;
  placement_order: number,
  module: string,
  config: any,
  status: string,
  is_enabled: boolean,
  levels: any[],
  initialTrigger: any[],
  created_on?: bigint;
  updated_on?: bigint;
  created_by: string,
  updated_by: string,
  is_updated?: boolean;
  program_id: string,
  is_deleted: boolean,
  workflow_id: string,
  flow_count: number,
  limit: number,
  page: number
}

export interface Recipient {
  name: string;
  id?: string;
  level_id: string;
  user_id: string;
  avatar: string;
  role_id: string;
  // user: Users
  recipient_type: string;
  behaviour: string;
}

export interface Level {
  level_id: string;
  level_status: string;
  placement_order: number;
  level_order: number;
  behaviour: string;
  // is_bypassed:string;
  is_show_buttons?:any;
  recipients: Recipient[];
}

export interface Workflow {
  status: string;
  program_id: string;
  job_workflow_id: string;
  workflow_id: string;
  workflow_name: string;
  workflow_type: string;
  event_slug: string;
  event_title: string;
 
  levels: Level[];
  config: any
  is_rejected_workflow?: boolean;
}

export interface Users {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  role_id: string;
  email: string;
}
export interface NotificationPayload {
  placement_order?: number;
  // userIds?: any[];
  job_id: string;

}