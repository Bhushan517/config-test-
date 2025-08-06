//write interface file of shiftType
export enum ShiftFormat {
  duration = 'duration',
  split = 'split',
  time = 'time',
}

export interface ShiftTypeAttributes {
    program_id: string;
    shift_type_name: string;
    time_duration: string;
    shift_type_category: string;
    shift_start_time: string;
    shift_end_time: string;
    shift_format:ShiftFormat;
    is_enabled: boolean;
    is_deleted: boolean;
    created_on?: bigint;
    updated_on?: bigint;
    created_by: string;
    updated_by: string;
    hierarchy_ids:string;
    is_billable: boolean;
  }