import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Link } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CircleCheckIcon,
  EllipsisVerticalIcon,
  LoaderIcon,
  SquareArrowOutUpRight,
  UserIcon,
} from 'lucide-react'

export type User = {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  role: string
  kyc?: {
    status: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  }
  address?: {
    street: string
    city: string
    state: string
    country: string
    zipcode: string
  }
  totalPlans?: number
  profileImage?: string
}

export const userColumns: ColumnDef<User>[] = [
  // {
  //   id: 'select',
  //   header: ({ table }) => (
  //     <div className="flex items-center justify-center">
  //       <Checkbox
  //         checked={table.getIsAllPageRowsSelected()}
  //         indeterminate={
  //           table.getIsSomePageRowsSelected() &&
  //           !table.getIsAllPageRowsSelected()
  //         }
  //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //         aria-label="Select all"
  //       />
  //     </div>
  //   ),
  //   cell: ({ row }) => (
  //     <div className="flex items-center justify-center">
  //       <Checkbox
  //         checked={row.getIsSelected()}
  //         onCheckedChange={(value) => row.toggleSelected(!!value)}
  //         aria-label="Select row"
  //       />
  //     </div>
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    id: 'fullName',
    header: 'Full Name',
    cell: ({ row }) => {
      const { firstName, lastName, profileImage } = row.original
      const name = `${firstName} ${lastName}`.trim()
      return (
        <div className="flex items-center gap-2 px-4 py-1">
          <Avatar className="size-7">
            <AvatarImage src={profileImage} alt={name} />
            <AvatarFallback className="text-muted-foreground bg-transparent border">
              <UserIcon className="size-3.25" />
            </AvatarFallback>
          </Avatar>
          <span>{name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { className: 'max-w-[120px] truncate px-4' },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'address.country',
    header: 'Country',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-muted-foreground px-1.5 flex items-center gap-1"
      >
        {row.original.status === 'ACTIVE' ? (
          <CircleCheckIcon className="size-3 fill-green-500 dark:fill-green-400" />
        ) : (
          <LoaderIcon className="size-3 animate-spin" />
        )}
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'totalPlans',
    header: 'Total Plans',
    cell: ({ row }) => {
      const totalPlans = row.original.totalPlans
      const creatorId = row.original._id
      if (!totalPlans || totalPlans === 0)
        return (
          <div className="flex items-center gap-1 italic text-muted-foreground">
            <span>No Plans Yet</span>
          </div>
        )
      return (
        <Link
          to="/plans"
          search={{
            page: 1,
            limit: 10,
            creator: creatorId,
          }}
          className="flex items-center gap-1 underline"
        >
          <span>{totalPlans} Plans</span>
          <SquareArrowOutUpRight className="size-3.5" />
        </Link>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const onViewUser = (
        table.options.meta as { onViewUser?: (user: User) => void }
      )?.onViewUser
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="data-open:bg-muted text-muted-foreground flex size-8"
                size="icon"
              />
            }
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => onViewUser?.(row.original)}>
              View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
