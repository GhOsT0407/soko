// Development switches. Everything here should be `false` before a release.

/**
 * Skip the sign-in screen. With no stored session the app signs in
 * anonymously (Supabase Auth → Providers → Anonymous must be on), so data
 * still saves under a real uid. If that's disabled, it falls back to a
 * read-only preview with a placeholder business so the screens can be seen.
 */
export const SKIP_AUTH = true

/** The stand-in business for preview mode — never written to the database. */
export const PREVIEW_BUSINESS = {
  id: '00000000-0000-0000-0000-000000000000',
  user_id: '00000000-0000-0000-0000-000000000000',
  name: 'Preview Stores',
  owner_name: 'Preview',
  type: 'trader',
  created_at: new Date(0).toISOString(),
}
