"use client"

import { useState, type ReactNode } from "react"
import { AnimatePresence, m } from "framer-motion"
import { ArrowLeft, CheckCircle2, LifeBuoy, Wrench } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Node = {
  id: string
  title: string
  body?: string
  options?: { label: string; next: string }[]
  resolution?: string
}

/** A small, explainable troubleshooting decision tree (spec 8.2 "Tatizo na friji"). */
const NODES: Record<string, Node> = {
  start: {
    id: "start",
    title: "Is the fridge powered on?",
    body: "Check the indicator light or display on the fridge.",
    options: [
      { label: "Yes, it has power", next: "door" },
      { label: "No, it is off", next: "no-power" },
    ],
  },
  "no-power": {
    id: "no-power",
    title: "Restore power",
    resolution:
      "Check the wall socket and the breaker. If the facility is on solar, open the Power page and confirm the battery has charge. Once power returns, watch the temperature for 30 minutes.",
  },
  door: {
    id: "door",
    title: "Does the door close and seal fully?",
    body: "Look for items blocking the door or a worn rubber seal.",
    options: [
      { label: "Yes, it seals well", next: "ambient" },
      { label: "No, it does not seal", next: "door-fix" },
    ],
  },
  "door-fix": {
    id: "door-fix",
    title: "Fix the door seal",
    resolution:
      "Remove anything blocking the door, clean the rubber seal, and make sure vaccine boxes are not over the load line. Re-check the temperature in 30 minutes.",
  },
  ambient: {
    id: "ambient",
    title: "Is the room very hot or in direct sun?",
    body: "High ambient temperature makes the fridge work harder.",
    options: [
      { label: "Yes, the room is hot", next: "ambient-fix" },
      { label: "No, the room is cool", next: "escalate" },
    ],
  },
  "ambient-fix": {
    id: "ambient-fix",
    title: "Cool the room",
    resolution:
      "Improve ventilation, keep the fridge away from direct sun and walls, and leave a gap around it for airflow. Re-check the temperature in 30 minutes.",
  },
  escalate: {
    id: "escalate",
    title: "Request a technician",
    resolution:
      "The basics look fine, so the unit may need a technician. Log the issue from Reports or call support, and move vaccines to a backup cold box if the temperature stays out of the 2–8°C band.",
  },
}

/** Spec 8.2 "Tatizo na friji" → guided troubleshooting. Must be inside <LazyMotionProvider>. */
export function FridgeTroubleshoot({
  open,
  onOpenChange,
  trigger,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
}) {
  const [history, setHistory] = useState<string[]>(["start"])
  const currentId = history[history.length - 1]
  const node = NODES[currentId]

  function go(next: string) {
    setHistory((h) => [...h, next])
  }
  function back() {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))
  }
  function restart() {
    setHistory(["start"])
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) restart()
        onOpenChange?.(o)
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" aria-hidden /> Fridge troubleshooting
          </DialogTitle>
          <DialogDescription>Answer a few questions to find the likely cause.</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <m.div
            key={currentId}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-base font-semibold text-foreground">{node.title}</h3>
            {node.body ? <p className="text-sm text-muted-foreground">{node.body}</p> : null}

            {node.resolution ? (
              <div className="flex items-start gap-2 rounded-lg bg-success/10 p-3 text-success">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p className="text-sm text-foreground">{node.resolution}</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {node.options?.map((opt) => (
                  <Button
                    key={opt.next}
                    variant="outline"
                    className="min-h-11 justify-start"
                    onClick={() => go(opt.next)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </m.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            disabled={history.length <= 1}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
          {node.resolution ? (
            <Button variant="ghost" size="sm" onClick={restart}>
              <LifeBuoy className="size-4" aria-hidden /> Start over
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
