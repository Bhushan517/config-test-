import { Json } from "sequelize/types/utils";

export interface VendorComplianceDocumentInterface {
  name: string;
  act?: string;
  document_number: string;
  upload_document_days: number;
  work_locations: object;
  attached_doc_url?: string;
  hierarchies?: Json;
  ref_id?: string;
  is_enabled: boolean;
  is_deleted: boolean;
  audited_by: string;
  audited_on: number;
  program_id: string;
  last_updated: Date
  uploaded_document: any;
  no_of_days: number;
  next_update_due: number;
  to_uploaded: string;
  document_details: string;
  status: string;
  created_on?: bigint;
  updated_on?: bigint;

}
