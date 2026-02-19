import * as React from 'react'

import {
  Empty as EmptyPrimitive,
  EmptyTitle,
  EmptyDescription,
  EmptyActions,
} from '@/components/ui/empty'

type EmptyProps = React.ComponentProps<typeof EmptyPrimitive>

function Empty(props: EmptyProps) {
  return <EmptyPrimitive {...props} />
}

export { Empty, EmptyTitle, EmptyDescription, EmptyActions }
