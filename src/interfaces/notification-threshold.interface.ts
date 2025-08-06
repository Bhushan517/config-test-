export interface ThresholdConfig {
    supportsBeforeThresholds: boolean;
    supportsAfterThresholds: boolean;
    threshold_unit: 'day' | 'month' | 'week' | 'percentage';
    threshold_value: number;
}

export interface ConfigItem {
    key: string;
    label: string;
    is_enable: boolean;
    threshold: ThresholdConfig[];
}

export interface ProgramThresholdInput {
    map: any;
    program_id: string;
    module: string;
    config: ConfigItem[];
    is_enabled: boolean;

}
