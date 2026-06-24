import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type SiteHeaderProps = {
  title: string
  /** Optional monospace caption rendered below the title (e.g. entity id). */
  subtitle?: string
  rightContent?: React.ReactNode
}

export function SiteHeader({ title, subtitle, rightContent }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex min-w-0 items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-base font-medium">{title}</h1>
            {subtitle && (
              <code className="truncate text-[10px] text-muted-foreground">
                {subtitle}
              </code>
            )}
          </div>
        </div>
        {rightContent ? (
          <div className="flex items-center gap-2">{rightContent}</div>
        ) : null}
      </div>
    </header>
  )
}
