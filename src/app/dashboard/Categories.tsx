import { Button } from "@/components/ui/button";

export default function Categories(){ 
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Categories</h2>
          <p className="text-sm text-muted-foreground">
            Organize menu items into structured product categories.
          </p>
        </div>
        <Button >Add Category</Button>
      </div>
    </div>
    ) 
}