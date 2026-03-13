import { workspacesApi, type Workspace } from '@/lib/api/endpoints/workspaces'

export const POST_AUTH_ROUTES = {
  dashboard: '/dashboard',
  onboardingWorkspace: '/onboarding/workspace',
  onboardingInvite: '/onboarding/invite',
} as const

interface PostAuthRoutingResult {
  route: string
  workspace: Workspace | null
}

export async function resolvePostAuthRoute(): Promise<PostAuthRoutingResult> {
  try {
    const res = await workspacesApi.list()
    const existingWorkspace = res.data.items[0] ?? null

    if (!existingWorkspace) {
      return {
        route: POST_AUTH_ROUTES.onboardingWorkspace,
        workspace: null,
      }
    }

    return {
      route: POST_AUTH_ROUTES.dashboard,
      workspace: existingWorkspace,
    }
  } catch {
    return {
      route: POST_AUTH_ROUTES.onboardingWorkspace,
      workspace: null,
    }
  }
}
