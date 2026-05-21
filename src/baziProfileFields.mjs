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

export const BAZI_PROFILE_LIST_SELECT = BAZI_PROFILE_LIST_FIELDS.join(', ')
export const BAZI_PROFILE_QIMEN_SELECT = BAZI_PROFILE_QIMEN_FIELDS.join(', ')
