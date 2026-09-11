import { FacebookIcon, InstagramIcon, XIcon } from './SocialIcons'

/**
 * Single source of truth for BipHub's social profiles.
 *
 * Shared by the footer icon row, the desktop nav "Follow us" dropdown, and
 * the mobile sheet icon row so all three surfaces stay in sync.
 *
 * TODO: replace '#' with the real profile URLs.
 */
export const SOCIAL_LINKS = [
  { name: 'Facebook', label: 'BipHub on Facebook', href: '#', Icon: FacebookIcon },
  { name: 'Instagram', label: 'BipHub on Instagram', href: '#', Icon: InstagramIcon },
  { name: 'X', label: 'BipHub on X', href: '#', Icon: XIcon },
] as const

export type SocialLink = (typeof SOCIAL_LINKS)[number]
