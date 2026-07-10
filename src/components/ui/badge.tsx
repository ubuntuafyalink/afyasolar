import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        success:
          'border-transparent bg-success text-success-foreground [a&]:hover:bg-success/90',
        warning:
          'border-transparent bg-warning text-warning-foreground [a&]:hover:bg-warning/90',
        solar:
          'border-transparent bg-solar text-solar-foreground [a&]:hover:bg-solar/90',
        // Soft tonal variants — quieter, premium status pills (tint + coloured text)
        primarySoft:
          'border-primary/15 bg-primary/10 text-primary [a&]:hover:bg-primary/15',
        successSoft:
          'border-success/15 bg-success/10 text-success [a&]:hover:bg-success/15',
        warningSoft:
          'border-warning/20 bg-warning/15 text-warning-foreground [a&]:hover:bg-warning/20',
        solarSoft:
          'border-solar/20 bg-solar/15 text-solar-foreground [a&]:hover:bg-solar/20',
        destructiveSoft:
          'border-destructive/15 bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15',
        muted:
          'border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
