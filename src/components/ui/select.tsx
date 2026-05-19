"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

function Select<Value = string>(props: SelectPrimitive.Root.Props<Value>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("truncate")}
      {...props}
    />
  )
}

function SelectPortal(props: React.ComponentProps<typeof SelectPrimitive.Portal>) {
  return (
    <SelectPrimitive.Portal data-slot="select-portal" {...props} />
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Popup> &
  Pick<React.ComponentProps<typeof SelectPrimitive.Positioner>, "side" | "sideOffset" | "align"> & {
    children?: React.ReactNode
  }) {
  return (
    <SelectPortal>
      <SelectPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
        align={align}
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "w-[var(--anchor-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List
            className="max-h-[300px] overflow-y-auto p-1"
          >
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPortal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectLabel(props: React.ComponentProps<typeof SelectPrimitive.GroupLabel>) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground")}
      {...props}
    />
  )
}

function SelectSeparator(props: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-muted")}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectPortal,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
