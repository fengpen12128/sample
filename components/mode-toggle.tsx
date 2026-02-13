"use client"

import * as React from "react"
import { PaletteIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const currentLabel = theme === "hyperdash" ? "Hyperdash" : "Original"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <PaletteIcon className="h-3.5 w-3.5" />
          <span>Theme: {currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Original
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("hyperdash")}>
          Hyperdash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
