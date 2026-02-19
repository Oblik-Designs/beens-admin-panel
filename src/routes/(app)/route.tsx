import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getProfileOptions } from '@/queries/users'

export const Route = createFileRoute('/(app)')({
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(getProfileOptions)
      if (!user?.success || !user?.data) {
        throw new Error('No user found')
      }
    } catch (error) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
