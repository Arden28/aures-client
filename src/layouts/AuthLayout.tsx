import { Outlet } from "react-router-dom";
import { HandPlatter } from "lucide-react"

export default function AuthLayout() {
  return (
    
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
            <img src="/images/logo.png" alt="Logo" className="h-[35px]" />
        </a>
        <Outlet />
      </div>
    </div>
  );
}
