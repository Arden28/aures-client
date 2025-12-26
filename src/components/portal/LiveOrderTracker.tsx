
import type { ActiveSessionData } from "@/api/portal";
import {
  Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "../ui/button";
import OrderTrackerCard from "./OrderTrackerCard";
import { formatMoney } from "@/lib/utils";
import { X } from "lucide-react";


export default function LiveOrderTracker({ isOpen, onClose, sessionData, currency }: { isOpen: boolean, onClose: () => void, sessionData: ActiveSessionData | null, currency: string }) {
    if (!sessionData) return null


  // 1. Prepare Orders
  let orders = (sessionData as any).orders || [];

  // Fallback: Virtual order if orders array is missing but items exist
  if (orders.length === 0 && sessionData.items.length > 0) {
    orders = [{
      id: sessionData.session_id,
      status: sessionData.status,
      items: sessionData.items,
      total: sessionData.total_due, // Fallback to session total
      estimatedTime: sessionData.estimatedTime,
      timestamp: sessionData.timestamp
    }];
  }

  // 2. Sort: Active orders first, then completed/cancelled
  const sortedOrders = [...orders].sort((a: any, b: any) => {
     const score = (s: string) => {
       if (['ready', 'preparing', 'pending'].includes(s)) return 2;
       if (s === 'served') return 1;
       return 0;
     }
     return score(b.status) - score(a.status) || b.id - a.id;
  });

  // 3. Fix Total: Calculate sum of ONLY the orders shown
  const ordersTotal = sortedOrders.reduce((acc: number, o: any) => acc + (o.status !== 'cancelled' ? o.total : 0), 0);

    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-w-lg mx-auto h-[90vh] rounded-t-[2rem]">
          <DrawerHeader className="border-b border-border/50 pb-4 shrink-0 relative flex items-center justify-between px-6 pt-6">
              <div className="text-left">
                <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
                  Session Status
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </DrawerTitle>
                {/* <p className="text-sm text-muted-foreground font-medium mt-1">Session #{sessionData.session_id}</p> */}
                
                {/* <pre>{JSON.stringify(orders, null, 2)}</pre> */}
              </div>
              <DrawerClose asChild>
                 <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted">
                   <X className="h-5 w-5" />
                 </Button>
             </DrawerClose>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto bg-muted/10 p-6 space-y-6">
             {/* Render a tracker card for EACH order in the session */}
             {orders.length > 0 ? (
                 orders.map((order: any) => (
                     <OrderTrackerCard key={order.id} order={order} currency={currency} />
                 ))
             ) : (
                 <div className="text-center text-muted-foreground p-4">No active orders found.</div>
             )}
             
             <div className="border-t pt-4 mt-8">
                 <div className="flex justify-between text-xl font-bold"><span>Total Due</span><span>{formatMoney(ordersTotal, currency)}</span></div>
             </div>
          </div>
          
           {/* Footer Actions */}
           <div className="p-4 sm:p-6 border-t border-border/50 bg-background/80 backdrop-blur-md sm:rounded-b-[2rem]">
             <Button 
               className="w-full h-14 text-lg font-bold rounded-xl shadow-lg text-white shadow-primary/10" 
               variant="default" 
               onClick={onClose}
             >
               Back to Menu
             </Button>
          </div>

        </DrawerContent>
      </Drawer>
    )
}