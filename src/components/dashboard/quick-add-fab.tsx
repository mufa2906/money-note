"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal"

export function QuickAddFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full shadow-lg hidden lg:flex"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
      <AddTransactionModal open={open} onOpenChange={setOpen} />
    </>
  )
}
