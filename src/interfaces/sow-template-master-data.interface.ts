export interface SOWTemplateMasterDataInterface {
  id?: string;
  program_id?: string;
  sow_temp_id?: string;
  sow_data_id?: string;
  sow_master_data_type_id?:JSON;
  sow_master_data_id?:JSON;
  is_deleted: boolean;
  is_enabled: boolean;
  created_on?: bigint;
  updated_on?: bigint;
  created_by:string;
  updated_by:string;
}

export interface SOWTemplateMasterData{
  master_data_type: string;
  master_data: string[];
}

