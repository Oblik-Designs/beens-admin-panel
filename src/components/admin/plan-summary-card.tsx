/**
 * Plan summary — sidebar card with the at-a-glance attributes:
 * Category · Type · Status · Budget, laid out in a 2-column × 2-row
 * grid. Hosted by / Location / Schedule have moved up into the top
 * header card on the Plan 360 page.
 */
export interface PlanSummaryCardProps {
    plan: Record<string, any>
}

export function PlanSummaryCard({ plan }: PlanSummaryCardProps) {
    const category = (plan.category?.name as string | undefined) ?? null
    const type = (plan.type as string | undefined) ?? null
    const status = (plan.status as string | undefined) ?? null
    const budget = plan.budget as
        | { amount?: number; currency?: string }
        | undefined
    const budgetValue =
        budget?.amount !== undefined
            ? `${budget.currency?.toUpperCase() ?? 'THB'} ${budget.amount}`
            : null

    return (
        <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Category" value={category} />
                <Field label="Type" value={type?.toLowerCase()} />
                <Field label="Status" value={status?.toLowerCase()} />
                <Field label="Budget" value={budgetValue} mono />
            </div>
        </div>
    )
}

interface FieldProps {
    label: string
    value: string | null | undefined
    mono?: boolean
}

function Field({ label, value, mono }: FieldProps) {
    return (
        <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
            </div>
            <div
                className={
                    mono
                        ? 'truncate font-mono text-sm font-medium tabular-nums'
                        : 'truncate text-sm font-medium'
                }
            >
                {value && value.length > 0 ? value : '-'}
            </div>
        </div>
    )
}
