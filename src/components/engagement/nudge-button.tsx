import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, Loader2Icon, MailIcon, MailXIcon } from 'lucide-react'
import { nudgeRegistrationOptions } from '@/queries/users'
import { cn } from '@/lib/utils'

export interface NudgeButtonProps {
  userId: string
  hasEmail: boolean
  /** True when the account was already nudged inside the cooldown window. */
  alreadyNudged?: boolean
}

/**
 * Row-level "Follow up" — enqueues the Continue Registration email for a single
 * account. Disabled (with a reason) when there's no email to send to, and
 * flips to a "Sent" state once queued or if already nudged recently.
 */
export function NudgeButton({
  userId,
  hasEmail,
  alreadyNudged,
}: NudgeButtonProps) {
  const queryClient = useQueryClient()
  const [justSent, setJustSent] = React.useState(false)

  const mutation = useMutation({
    ...nudgeRegistrationOptions(),
    onSuccess: async (data) => {
      const r = data.results?.[0]
      if (r?.ok && r.sent) setJustSent(true)
      await queryClient.invalidateQueries({ queryKey: ['users', 'search'] })
    },
  })

  if (!hasEmail) {
    return (
      <span
        className="text-muted-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs opacity-60"
        title="No email on file — can't send a registration nudge"
      >
        <MailXIcon className="size-3.5" />
        No email
      </span>
    )
  }

  const sent = justSent || alreadyNudged

  return (
    <button
      type="button"
      disabled={mutation.isPending || sent}
      onClick={(e) => {
        e.stopPropagation()
        mutation.mutate({ userIds: [userId] })
      }}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:cursor-default',
        sent
          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'hover:bg-muted',
        mutation.isPending && 'opacity-70',
      )}
      title={
        sent ? 'Reminder already sent' : 'Send a Continue Registration email'
      }
    >
      {mutation.isPending ? (
        <Loader2Icon className="size-3.5 animate-spin" />
      ) : sent ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <MailIcon className="size-3.5" />
      )}
      {mutation.isPending ? 'Queuing…' : sent ? 'Sent' : 'Follow up'}
    </button>
  )
}
