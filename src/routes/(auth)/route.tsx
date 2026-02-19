import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getProfileOptions } from '@/queries/users'

export const Route = createFileRoute('/(auth)')({
  beforeLoad: async ({ context }) => {
    let user = null

    try {
      user = await context.queryClient.ensureQueryData(getProfileOptions)
    } catch (error) {}

    if (user?.success && user?.data) {
      throw redirect({
        to: '/',
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
