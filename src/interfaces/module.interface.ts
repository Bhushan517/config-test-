interface ModuleData {
  name: string,
  parent_module_id: string,
  description: string,
  is_enabled: boolean,
  is_deleted: boolean,
  created_on?: bigint;
  updated_on?: bigint;
  created_by: string,
  updated_by: string,
  is_custom_field: boolean,
  is_reason_code:boolean
}

export const paramsSchema = {
  type: 'object',
};


export const createModuleSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: "string" }, 
    is_workflow: { type: "boolean" },
    is_enabled: { type: "boolean" },
    is_deleted: { type: "boolean" },
    ref_order: { type: "string" }, 
    is_rule: { type: "boolean" },
    module_linking: {
      type: "array" },
      
    }
  };
 








export default ModuleData;
