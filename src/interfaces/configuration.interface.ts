import { Json } from "sequelize/types/utils";

export interface ConfigurationAttributes {
  id: string;
  config_model: string;
  title: string;
  description: string;
  key: string;
  data_type: string;
  value: Json;
  value_source: string;
  source_url: string;
  source_params: Json;
  is_requried: boolean;
  is_validations_requried: boolean;
  parent_config_id?: string;
  is_parent_value_required: boolean;
  parent_value: boolean;
  ui_component_type: string;
  created_by: string;
  created_on?: bigint;
  updated_on?: bigint;
  updated_by: string;
  sr_Number: number;
  options: Json;
  is_default: boolean;
  help_icon: boolean;
  help_icon_text: string;
  child_config: Json;
  placeholder_value:string;
}