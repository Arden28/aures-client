
export default function Orders(){
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Manage customer orders and their associated details.
          </p>
        </div>
        {/* <Button >Add Order</Button> */}
      </div>
    </div>
    ) 
}