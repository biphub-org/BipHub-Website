/**
 * Static registry of /guides articles.
 *
 * Each entry maps to a static page under app/(public)/guides/<slug>/page.tsx.
 * The slug array drives the /guides hub index — when you add a new guide,
 * create the page file AND add a row here.
 *
 * Topics are a secondary taxonomy surfaced as tiles in the /guides hero. The
 * audience axis still drives the hub body grouping. A guide can have multiple
 * topics (e.g. a future "Learning agreement deep-dive" might be tagged both
 * `find-apply` and `coordinators`).
 */

export type GuideAudience = 'students' | 'coordinators'

export type Topic =
  | 'find-apply'
  | 'funding'
  | 'travel-stay'
  | 'coordinators'

export interface Guide {
  slug: string
  title: string
  summary: string
  audience: GuideAudience
  readingTime: string
  topics: ReadonlyArray<Topic>
}

export interface TopicMeta {
  id: Topic
  label: string
  /** lucide-react icon name — resolved in the consumer. */
  icon: 'Compass' | 'Wallet' | 'Plane' | 'Building2'
  /** Short hint for the tile subtitle when the topic has no published guides yet. */
  comingSoon: string
}

export const TOPICS: ReadonlyArray<TopicMeta> = [
  {
    id: 'find-apply',
    label: 'Find & apply',
    icon: 'Compass',
    comingSoon: 'Discovery and applications.',
  },
  {
    id: 'funding',
    label: 'Funding',
    icon: 'Wallet',
    comingSoon: 'Grants, allowances, real costs.',
  },
  {
    id: 'travel-stay',
    label: 'Travel & stay',
    icon: 'Plane',
    comingSoon: 'Getting there, sleeping there.',
  },
  {
    id: 'coordinators',
    label: 'For coordinators',
    icon: 'Building2',
    comingSoon: 'Listing and maintaining BIPs.',
  },
] as const

export const GUIDES: ReadonlyArray<Guide> = [
  {
    slug: 'what-is-a-bip',
    title: 'What is a BIP?',
    summary:
      'The 5–10 day format, the virtual component, ECTS, eligibility, and eight FAQs — start here before you apply.',
    audience: 'students',
    readingTime: '10 min read',
    topics: ['find-apply'],
  },
  {
    slug: 'how-to-choose-a-bip',
    title: 'How to choose the right BIP',
    summary:
      'Topic, dates, language, ECTS, location, cost — the six factors that should drive your shortlist, in the order that matters.',
    audience: 'students',
    readingTime: '5 min read',
    topics: ['find-apply'],
  },
  {
    slug: 'how-to-apply',
    title: 'How to apply for a BIP',
    summary:
      'A step-by-step walkthrough of the application process — from your home Erasmus office to the learning agreement and the grant payment.',
    audience: 'students',
    readingTime: '6 min read',
    topics: ['find-apply'],
  },
  {
    slug: 'for-coordinators',
    title: 'Listing your BIP on BipHub',
    summary:
      'A practical guide for university coordinators: account setup, the five-step submission wizard, what reviewers look for, and how to keep listings fresh.',
    audience: 'coordinators',
    readingTime: '7 min read',
    topics: ['coordinators'],
  },
] as const

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export const GUIDE_SLUGS = GUIDES.map((g) => g.slug)

export function countGuidesByTopic(topic: Topic): number {
  return GUIDES.filter((g) => g.topics.includes(topic)).length
}
