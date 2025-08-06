export interface LanguageData {
  id?: string; // UUID
  name?: string;
  type?: string;
  locale?:string;
  created_on?: bigint;
  updated_on?: bigint;
  created_by:string;
  updated_by:string;
  is_deleted?: boolean
}