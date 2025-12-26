import type { OrderSummary } from "@/api/portal";
import { cn, formatMoney } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CheckCircle2, ChefHat, Receipt } from "lucide-react";


export default function OrderTrackerCard({ order, currency }: { order: OrderSummary, currency: string }) {
  // 1. Define the happy path steps
  const steps = [
    { id: 'pending', label: 'Received', icon: <Receipt className="h-3.5 w-3.5" /> }, 
    { id: 'preparing', label: 'Cooking', icon: <ChefHat className="h-3.5 w-3.5" /> }, 
    { id: 'ready', label: 'Ready', icon: <BellRing className="h-3.5 w-3.5" /> }, // Changed icon to BellRing
    { id: 'served', label: 'Served', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
  ]

  // 2. Handle Edge Cases (Cancelled/Refunded)
  const isCancelled = order.status === 'cancelled';
  
  // 3. Normalize Status for the Stepper
  // Map 'completed' -> 'served' for the UI. 
  const statusForStepper = order.status === 'completed' ? 'served' : order.status;
  
  // Find current index. If status is unknown (like cancelled), default to -1
  const currentIdx = steps.findIndex(s => s.id === statusForStepper);
  
  // Progress Calculation
  // If cancelled, 0 progress. If served/completed, 100%.
  const progressPercent = isCancelled 
    ? 0 
    : (currentIdx / (steps.length - 1)) * 100;

  return (
    <div className={cn(
      "flex flex-col gap-5 py-6 border-b border-border/50 last:border-0 last:pb-0 first:pt-2 transition-opacity",
      isCancelled && "opacity-60 grayscale-[0.8]" // Dim cancelled orders
    )}>
      
      {/* --- Header: Order Info & Main Status --- */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-lg tracking-tight text-foreground">
              Order #{order.id}
            </h3>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border/50">
              {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium pl-0.5">
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'} &bull; {order.estimatedTime || 'ASAP'}
          </p>
        </div>
        
        {/* Status Badge */}
        <div className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm border",
          isCancelled 
            ? "bg-red-100 text-red-700 border-red-200"
            : order.status === 'served' || order.status === 'completed'
              ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
              : "bg-primary/10 text-primary border-primary/20"
        )}>
          {/* Pulsing Dot for active statuses */}
          {!isCancelled && order.status !== 'served' && order.status !== 'completed' && (
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
             </span>
          )}
          {isCancelled ? "Cancelled" : order.status}
        </div>
      </div>

      {/* --- Stepper (Hide if cancelled) --- */}
      {!isCancelled && (
        <div className="w-full max-w-4xl mx-auto px-4 py-10">
      <div className="relative">
        
        {/* 1. The Track - Matte & Solid
            A simple, clean line. No blur, no glass. 
            looks like a table runner or a timeline.
        */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted/60 rounded-full -translate-y-1/2" />

        {/* 2. The Progress Fill
            Solid color. High contrast. 
        */}
        <motion.div
          className="absolute top-1/2 left-0 h-1 bg-primary rounded-full -translate-y-1/2 origin-left z-0"
          initial={{ width: "0%" }}
          animate={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* 3. The Steps */}
        <div className="relative flex justify-between w-full z-10">
          {steps.map((step, i) => {
            const isActive = currentIdx === i;
            const isCompleted = currentIdx > i;
            const isPending = currentIdx < i;

            return (
              <div key={step.id} className="relative flex flex-col items-center group cursor-default">
                
                {/* The "Plate" Circle */}
                <motion.div
                  className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors duration-300 bg-background",
                    // Completed: Solid Fill (Brand Color)
                    isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                    // Active: White Plate with Color Rim
                    isActive ? "border-primary text-primary" : 
                    // Pending: Greyed out
                    "border-muted text-muted-foreground/40"
                  )}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.25 : 1, // Active step gets bigger (The Main Course)
                    backgroundColor: isCompleted ? "var(--primary)" : "var(--background)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  
                  {/* The Double Ring Effect for Active State (Like a clean plate rim) */}
                  {isActive && (
                    <motion.div
                      layoutId="plate-ring"
                      className="absolute -inset-[5px] rounded-full border border-primary/30"
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  {/* Icon Switcher */}
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.div
                        key="check"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center"
                      >
                         {/* <Check className="w-6 h-6 stroke-[3]" /> */}
                          <div className="h-[15px]">{step.icon}</div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        className="flex items-center justify-center"
                        // The "Bell Ring" Animation
                        // A slow, pendulum swing. Distinctly "analog" feel.
                        animate={isActive ? { rotate: [0, 10, -10, 5, -5, 0] } : { rotate: 0 }}
                        transition={isActive ? {
                          repeat: Infinity,
                          repeatDelay: 2, // Calm waits between movements
                          duration: 2,
                          ease: "easeInOut"
                        } : {}}
                      >
                        <div className="w-5 h-5">
                            {step.icon}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Typography: Clean, Menu-style */}
                <div className="absolute top-16 w-32 flex flex-col items-center text-center">
                  <span className={cn(
                    "text-xs font-bold tracking-wider uppercase transition-colors duration-300",
                    isActive ? "text-primary" : "text-muted-foreground",
                    // Hide inactive labels on mobile to keep it clean
                    !isActive && "hidden sm:block"
                  )}>
                    {step.label}
                  </span>
                  
                  {/* Optional: Add a "Serving" status text for the active item */}
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-muted-foreground font-medium mt-1 sm:hidden"
                    >
                      Step {i + 1}
                    </motion.span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
      )}

      {/* --- Item List (With Granular Status) --- */}
      <div className="bg-muted/20 rounded-xl border border-border/40 overflow-hidden mt-1">
        <div className="px-4 py-3 space-y-3">
          {order.items.map((item: any, idx: number) => {
            // Check if item status differs significantly from order status
            const showItemStatus = item.status && item.status !== 'pending' && item.status !== 'served';
            
            return (
              <div key={idx} className="flex justify-between items-start text-sm group">
                <div className="flex gap-3 items-start">
                  <span className="font-mono text-xs font-bold text-muted-foreground bg-background border border-border/60 rounded px-1.5 min-w-[26px] text-center pt-0.5 shadow-sm">
                    {item.quantity}x
                  </span>
                  <div className="flex flex-col leading-snug">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground/90">{item.product.name}</span>
                      
                      {/* <pre>{JSON.stringify(order, null, 2)}</pre> */}

                      {/* Granular Item Status Badge */}
                      {showItemStatus && (
                         <span className={cn(
                           "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                           item.status === 'cooking' ? "bg-orange-100 text-orange-600" :
                           item.status === 'ready' ? "bg-blue-100 text-blue-600" :
                           "bg-gray-100 text-gray-600"
                         )}>
                           {item.status}
                         </span>
                      )}
                    </div>

                    {item.notes && (
                      <span className="text-[11px] text-orange-600/90 italic mt-0.5 flex items-start gap-1">
                        <span className="text-[9px] leading-[14px]">📝</span> 
                        {item.notes}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground pt-0.5">
                  {formatMoney(item.quantity * item.product.price, currency)}
                </span>
              </div>
            )
          })}
        </div>
        
        {/* Total Footer */}
        <div className="bg-muted/40 border-t border-border/40 px-4 py-3 flex justify-between items-center">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Total</span>
          <span className="font-bold text-sm text-foreground">{formatMoney(order.total, currency)}</span>
        </div>
      </div>
    </div>
  )
}
