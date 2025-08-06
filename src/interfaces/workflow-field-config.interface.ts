export interface WorkflowFieldConfigAttributes {
  id?: string;               
  name: string;              
  slug: string;              
  config?: object;           
  placement_order?: number;  
  nest_level?: number;       
  field_id?: string;        
  parent_config_id?: string; 
  schema?: string;           
  is_enabled?: boolean;     
  created_on?: bigint;
  updated_on?: bigint;     
  created_by?: string;       
  updated_by?: string;      
  is_deleted?: boolean; 
}

