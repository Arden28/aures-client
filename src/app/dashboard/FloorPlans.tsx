import { Button } from "@/components/ui/button";

export default function FloorPlans(){ 
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Floor Plans</h2>
          <p className="text-sm text-muted-foreground">
            Design and manage restaurant floor layouts.
          </p>
        </div>
        <Button >Add Floor</Button>
      </div>
    </div>
    ) 
}