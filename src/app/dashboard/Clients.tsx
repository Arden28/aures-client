import { Button } from "@/components/ui/button";

export default function Clients(){ 
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage client records and their related information.
          </p>
        </div>
        <Button >Add Client</Button>
      </div>
      
    </div>
    ) 
}