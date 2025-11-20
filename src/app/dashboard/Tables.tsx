import { Button } from "@/components/ui/button";

export default function Tables(){ 
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tables</h2>
          <p className="text-sm text-muted-foreground">
            Manage dining tables and their assignments.
          </p>
        </div>
        <Button >Add Table</Button>
      </div>
      
    </div>
    ) 
}