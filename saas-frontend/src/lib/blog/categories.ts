/**
 * Category landing page content configuration
 * Rich SEO content for each blog category to improve search rankings
 */

export interface CategoryContent {
  slug: string;
  name: string;
  headline: string;
  description: string;
  seoDescription: string;
  keywords: string[];
  featuredTopics: string[];
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;
  ctaButtonLink: string;
}

export const categoryContent: Record<string, CategoryContent> = {
  'exploring-the-paranormal': {
    slug: 'exploring-the-paranormal',
    name: 'Exploring the Paranormal',
    headline: 'Understanding the Unexplained',
    description:
      'From spirit communication to paranormal investigation, explore what lies beyond ordinary reality. Whether you are experiencing unexplained phenomena, grieving a loss and seeking connection, or simply curious about the other side, these guides offer practical information grounded in both research and lived experience.',
    seoDescription:
      'Explore paranormal phenomena, spirit communication, ghost hunting, and mediumship. Learn about signs from deceased loved ones, how paranormal investigators work, and the science behind unexplained experiences.',
    keywords: [
      'paranormal investigation',
      'spirit communication',
      'signs from deceased loved ones',
      'ghost hunting',
      'mediumship',
      'haunted house help',
      'EVP recordings',
      'types of ghosts',
      'poltergeist activity',
      'shadow people',
      'afterlife communication',
      'paranormal research',
    ],
    featuredTopics: [
      'Spirit Communication',
      'Paranormal Investigation',
      'Signs from the Departed',
      'Types of Hauntings',
      'Research & Evidence',
    ],
    ctaTitle: 'Experiencing Something Unexplained?',
    ctaDescription:
      'SpiriAssist connects you with vetted paranormal investigators, mediums, and spiritual practitioners who can help you understand what is happening.',
    ctaButtonText: 'Get Help with SpiriAssist',
    ctaButtonLink: '/spiriassist',
  },

  'finding-spiritual-guidance': {
    slug: 'finding-spiritual-guidance',
    name: 'Finding Spiritual Guidance',
    headline: 'Navigate Your Spiritual Journey',
    description:
      'Finding the right spiritual guidance can be transformative—but knowing where to start is often the hardest part. These guides help you understand different spiritual modalities, find trustworthy practitioners, and prepare for meaningful sessions. From tarot and psychic readings to energy healing, astrology, and mediumship, discover what each practice offers and how to choose what is right for you.',
    seoDescription:
      'Find trustworthy psychics, tarot readers, energy healers, astrologers, and mediums. Learn what to expect from spiritual readings, how to prepare, and how to avoid scams. Guidance for your spiritual journey.',
    keywords: [
      'find a psychic near me',
      'tarot reading',
      'energy healer near me',
      'psychic medium',
      'reiki session',
      'how to find a psychic',
      'astrology reading',
      'birth chart reading',
      'chakra healing',
      'spiritual guidance',
      'first tarot reading',
      'psychic reading cost',
    ],
    featuredTopics: [
      'Tarot & Oracle Readings',
      'Psychic Readings',
      'Energy Healing & Reiki',
      'Mediumship & Spirit Communication',
      'Astrology & Birth Charts',
    ],
    ctaTitle: 'Ready to Connect with a Practitioner?',
    ctaDescription:
      'SpiriVerse hosts vetted spiritual practitioners ready to guide you. Find tarot readers, psychics, energy healers, astrologers, and mediums who match your needs.',
    ctaButtonText: 'Browse Practitioners',
    ctaButtonLink: '/discover',
  },

  'faith-and-community-connection': {
    slug: 'faith-and-community-connection',
    name: 'Faith & Community Connection',
    headline: 'Deepen Your Faith, Find Your Community',
    description:
      'Spiritual growth flourishes in community. Whether you are seeking a faith community that welcomes you as you are, looking for a spiritual director or mentor, or finding your way back to faith after time away, these guides offer practical wisdom. Explore how to find communities and guides that support your unique spiritual path.',
    seoDescription:
      'Find a church or faith community near you. Learn about spiritual direction, faith mentorship, and reconnecting with spirituality. Resources for modern seekers exploring faith and community.',
    keywords: [
      'find a church near me',
      'spiritual director',
      'faith community',
      'spiritual mentor',
      'returning to church',
      'online church services',
      'progressive church',
      'LGBTQ welcoming church',
      'spiritual guidance counselor',
      'reconnect with faith',
      'find religious community',
      'contemplative prayer',
    ],
    featuredTopics: [
      'Finding Faith Communities',
      'Spiritual Direction',
      'Faith Mentorship',
      'Online Faith Resources',
      'Returning to Faith',
    ],
    ctaTitle: 'Looking for Spiritual Community?',
    ctaDescription:
      'Connect with faith communities, spiritual directors, and mentors through SpiriVerse. Find support for wherever you are on your spiritual journey.',
    ctaButtonText: 'Find Your Community',
    ctaButtonLink: '/discover',
  },

  'why-practitioners-are-joining-spiriverse': {
    slug: 'why-practitioners-are-joining-spiriverse',
    name: 'Why Practitioners Are Joining SpiriVerse',
    headline: 'Grow Your Spiritual Practice Online',
    description:
      'The shift to online spiritual services has opened unprecedented opportunities for practitioners. Whether you offer tarot readings, energy healing, psychic services, or run a metaphysical shop, these guides help you build and grow a thriving practice. Learn marketing strategies, technology tools, and best practices from practitioners who have successfully made the transition.',
    seoDescription:
      'Start and grow your online spiritual business. Marketing tips for tarot readers, psychics, energy healers, and metaphysical shops. Learn how to find clients and build a thriving practice from home.',
    keywords: [
      'start spiritual business',
      'online tarot business',
      'work from home psychic',
      'energy healer marketing',
      'sell crystals online',
      'spiritual entrepreneur',
      'grow healing practice',
      'psychic business tips',
      'metaphysical shop online',
      'remote reiki business',
      'find clients as healer',
      'spiritual business marketing',
    ],
    featuredTopics: [
      'Starting Your Online Practice',
      'Marketing & Finding Clients',
      'Building Your Brand',
      'Technology & Tools',
      'Growing Your Business',
    ],
    ctaTitle: 'Ready to Grow Your Practice?',
    ctaDescription:
      'Join SpiriVerse and connect with seekers looking for your unique offerings. Our platform handles bookings, payments, and discovery so you can focus on your craft.',
    ctaButtonText: 'Become a Merchant',
    ctaButtonLink: '/',
  },

  'personal-spiritual-practice': {
    slug: 'personal-spiritual-practice',
    name: 'Personal Spiritual Practice',
    headline: 'Deepen Your Practice with Powerful Tools',
    description:
      'Your spiritual journey is uniquely yours. These guides help you build meaningful daily practices—from understanding your birth chart and tracking planetary transits to keeping a dream journal and working with crystals. Learn techniques you can use on your own, supported by tools designed to help you grow.',
    seoDescription:
      'Build your personal spiritual practice with guides on astrology birth charts, dream journaling, crystal work, chakra balancing, tarot journaling, and meditation. Free tools to support your spiritual growth.',
    keywords: [
      'birth chart calculator',
      'understand my birth chart',
      'planetary transits today',
      'dream journal guide',
      'crystal collection',
      'chakra balancing',
      'tarot journal',
      'meditation journal',
      'spiritual practice tips',
      'astrology for beginners',
      'moon phases spiritual',
      'synchronicity journal',
      'big three astrology',
      'sun moon rising signs',
    ],
    featuredTopics: [
      'Astrology & Birth Charts',
      'Dream Work',
      'Crystal Practice',
      'Energy & Chakras',
      'Tarot & Symbols',
      'Journaling',
    ],
    ctaTitle: 'Start Your Personal Space',
    ctaDescription:
      'SpiriVerse Personal Space gives you free tools to track your spiritual journey—birth charts, transit trackers, dream journals, crystal collections, and more. All in one place.',
    ctaButtonText: 'Create Your Personal Space',
    ctaButtonLink: '/register',
  },
};

/**
 * Get category content by slug or name
 */
export function getCategoryContent(categorySlugOrName: string): CategoryContent | null {
  // Try direct slug match first
  if (categoryContent[categorySlugOrName]) {
    return categoryContent[categorySlugOrName];
  }

  // Try converting name to slug
  const slug = categorySlugOrName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-');

  return categoryContent[slug] || null;
}

/**
 * Get all category slugs for static generation
 */
export function getAllCategorySlugs(): string[] {
  return Object.keys(categoryContent);
}
