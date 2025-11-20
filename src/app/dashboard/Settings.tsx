export default function Settings(){ 
    return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure system preferences and restaurant settings.
          </p>
        </div>
      </div>
    </div>
    ) 
}