export type SpiritualInterest =
  | 'MEDIUMSHIP'
  | 'PARANORMAL'
  | 'CRYSTALS'
  | 'WITCHCRAFT'
  | 'ENERGY'
  | 'HERBALISM'
  | 'FAITH';

export interface SpiritualInterestOption {
  key: SpiritualInterest;
  label: string;
  supportingText: string;
}

export const SPIRITUAL_INTERESTS: SpiritualInterestOption[] = [
  {
    key: 'MEDIUMSHIP',
    label: 'Mediumship & Intuition',
    supportingText: 'Readings, tarot, astrology, spirit connection'
  },
  {
    key: 'PARANORMAL',
    label: 'Paranormal & Investigation',
    supportingText: 'Ghost hunting, spirit evidence, haunted locations'
  },
  {
    key: 'CRYSTALS',
    label: 'Crystals & Stones',
    supportingText: 'Collecting, healing, grids, sacred tools'
  },
  {
    key: 'WITCHCRAFT',
    label: 'Witchcraft & Magick',
    supportingText: 'Spellwork, rituals, honoring the old ways'
  },
  {
    key: 'ENERGY',
    label: 'Energy Healing',
    supportingText: 'Reiki, chakras, auras, subtle body work'
  },
  {
    key: 'HERBALISM',
    label: 'Herbalism & Plant Medicine',
    supportingText: 'Botanicals, remedies, holistic wellness'
  },
  {
    key: 'FAITH',
    label: 'Faith & Prayer',
    supportingText: 'Walking with God, scripture, devotion'
  }
];
