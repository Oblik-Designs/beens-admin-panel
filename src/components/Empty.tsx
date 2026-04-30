import * as React from 'react'

import {
  EmptyActions,
  EmptyDescription,
  Empty as EmptyPrimitive,
  EmptyTitle,
} from '@/components/ui/empty'

type EmptyProps = React.ComponentProps<typeof EmptyPrimitive>

function Empty(props: EmptyProps) {
  return <EmptyPrimitive {...props} />
}

export { Empty, EmptyTitle, EmptyDescription, EmptyActions }
