export const BAZI_PROFILE_LIST_FIELDS = [
  'id',
  'user_id',
  'name',
  'gender',
  'birth_date',
  'birth_location',
  'is_default',
  'created_at',
]

export const BAZI_PROFILE_QIMEN_FIELDS = [
  ...BAZI_PROFILE_LIST_FIELDS,
  'bazi_str',
  'bazi_summary',
  'strong_weak',
  'geju',
]

export const BAZI_PROFILE_FULL_FIELDS = [
  ...BAZI_PROFILE_QIMEN_FIELDS,
  'adjusted_birth_date',
  'birth_latitude',
  'birth_longitude',
  'solar_time_mode',
  'solar_time_adjustment_minutes',
  'bazi_detail',
  'favorable_elements',
  'unfavorable_elements',
  'llm_yuanju_core',
  'llm_current_dayun',
  'llm_current_liunian',
  'life_events',
  'calibrated_yuanju_core',
  'calibrated_current_dayun',
  'calibrated_current_liunian',
  'calibrated_at',
  'calibrated_version',
]

export const BAZI_PROFILE_LIST_SELECT = BAZI_PROFILE_LIST_FIELDS.join(', ')
export const BAZI_PROFILE_QIMEN_SELECT = BAZI_PROFILE_QIMEN_FIELDS.join(', ')
export const BAZI_PROFILE_FULL_SELECT = BAZI_PROFILE_FULL_FIELDS.join(', ')
