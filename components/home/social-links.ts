import { InstagramIcon } from './SocialIcons'

/**
 * Single source of truth for BipHub's social profiles.
 *
 * Shared by the footer icon row and the nav bar Instagram link
 * so both surfaces stay in sync.
 */
export const SOCIAL_LINKS = [
  { name: 'Instagram', label: 'BipHub on Instagram', href: 'https://www.instagram.com/biphuborg', Icon: InstagramIcon },
] as const

export type SocialLink = (typeof SOCIAL_LINKS)[number]
