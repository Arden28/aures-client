import { Button } from "@/components/ui/button";

export default function Products(){ 
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage individual menu items and their pricing details.
          </p>
        </div>
        <Button >Add Product</Button>
      </div>
    </div>
    ) 
}