"use client"

import * as React from "react"
import { Eye, EyeSlash } from "@phosphor-icons/react"

import { Input } from "@/components/ui/input"

export function PasswordInput({ id, className = "", disabled, ...props }) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`h-9 pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
      >
        {visible ? <EyeSlash className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
