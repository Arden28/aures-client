import { Button } from "@/components/ui/button";

export default function Staff(){
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Staff</h2>
          <p className="text-sm text-muted-foreground">
            Manage registered staff members and their key details.
          </p>
        </div>
        <Button >Add Staff</Button>
      </div>
    </div>
    ) 
}