export interface CountyInterface {
    id: string;
    name?: string;
    region?: string;
    is_enabled: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    state_id: string;
    created_by?: any;
    updated_by?: any;
    ref_id?: string;
    is_deleted: boolean;
}

export const createCountySchema = {
  type: "object",
 properties: {
      id: { type: "string", },
      name: { type: "string" },
      region: { type: "string" },
      is_enabled: { type: "boolean" },
      created_on: { type: "number" }, 
      updated_on: { type: "number" },
      state_id: { type: "string", },
      created_by: { type: "string", },
      updated_by: { type: "string",},
      ref_id: { type: "string", },
      is_deleted: { type: "boolean"}
  }
};




