'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import {
  CalendarClockIcon,
  LayoutDashboardIcon,
  TicketIcon,
  TriangleAlertIcon,
  UsersIcon,
  WebhookIcon,
} from 'lucide-react'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { getProfileOptions } from '@/queries/users'

const navMain = [
  {
    title: 'Dashboard',
    url: '/',
    icon: <LayoutDashboardIcon />,
  },
  {
    title: 'Users',
    url: '/users',
    icon: <UsersIcon />,
  },
  {
    title: 'Plans',
    url: '/plans',
    icon: <CalendarClockIcon />,
  },
  {
    title: 'Tickets',
    url: '/tickets',
    icon: <TicketIcon />,
  },
  {
    title: 'Webhook Events',
    url: '/webhook-events',
    icon: <WebhookIcon />,
  },
  {
    title: 'Phantom On Hold',
    url: '/phantom-on-hold',
    icon: <TriangleAlertIcon />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: profileData } = useQuery(getProfileOptions)

  const user = React.useMemo(() => {
    const p = profileData?.data
    if (!p) {
      return {
        name: 'Loading...',
        email: '',
        avatar: '',
      }
    }
    const fullName =
      [p.firstName, p.lastName].filter(Boolean).join(' ') ||
      p.displayName ||
      'User'
    return {
      name: fullName,
      email: p.email ?? '',
      avatar: p.profileImage ?? '',
    }
  }, [profileData])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/">
              <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5! data-[slot=sidebar-menu-button]:min-h-20!">
                <div className="flex size-52 items-center justify-center">
                  <img
                    src="/beenslogo_1.png"
                    alt="Beens"
                    className="size-40 object-contain object-center"
                  />
                </div>
                {/* <span className="text-base font-semibold">Beens Admin Panel</span> */}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
