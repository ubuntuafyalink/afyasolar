"use client"

import { getPasswordStrength } from "@/lib/password-validation"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface PasswordStrengthIndicatorProps {
  password: string
  userInputs?: string[]
  className?: string
}

export function PasswordStrengthIndicator({ password, userInputs = [], className }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const strength = getPasswordStrength(password, userInputs)

  const progressValue = (strength.score / 4) * 100
  const colorClass = strength.color === 'green' ? 'bg-success' :
    strength.color === 'blue' ? 'bg-primary' :
    strength.color === 'yellow' ? 'bg-warning' :
    strength.color === 'orange' ? 'bg-solar' :
    'bg-destructive'

  const textColorClass = strength.color === 'green' ? 'text-success' :
    strength.color === 'blue' ? 'text-primary' :
    strength.color === 'yellow' ? 'text-warning' :
    strength.color === 'orange' ? 'text-solar' :
    'text-destructive'

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Strength:</span>
        <span className={cn("font-medium", textColorClass)}>
          {strength.label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${progressValue}%` }}
        />
      </div>
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
          {strength.feedback.slice(0, 2).map((suggestion, i) => (
            <li key={i} className="flex items-start gap-1">
              <span className="text-primary mt-0.5" aria-hidden>•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

