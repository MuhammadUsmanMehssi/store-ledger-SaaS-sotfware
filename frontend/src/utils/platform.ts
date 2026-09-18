import type { PlatformRole, User } from '@/types'

export function isPlatformAdmin(user: Pick<User, 'platformRole'> | null | undefined): boolean {
  return user?.platformRole === 'PLATFORM_ADMIN'
}

export function isPlatformAdminRole(role: PlatformRole | null | undefined): boolean {
  return role === 'PLATFORM_ADMIN'
}
