"use client"

import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
    ChefHat, 
    Home, 
    ArrowLeft, 
    SearchX, 
    UtensilsCrossed 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
    const navigate = useNavigate()

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground selection:bg-primary/20">
            
            {/* --- Background Texture & Gradients --- */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
                <div className="absolute right-0 bottom-0 -z-10 m-auto h-[200px] w-[200px] rounded-full bg-orange-500/10 opacity-20 blur-[80px]"></div>
            </div>

            {/* --- Main Content --- */}
            <div className="relative z-10 container max-w-lg px-4 text-center">
                
                {/* 1. Animated Icon / 404 Graphic */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="relative mx-auto mb-8 h-32 w-32 flex items-center justify-center"
                >
                    {/* The "Plate" background */}
                    <div className="absolute inset-0 rounded-full bg-muted/50 border border-border shadow-inner" />
                    
                    {/* The crossed utensils (The "X") */}
                    <motion.div
                        initial={{ rotate: -45, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <UtensilsCrossed className="h-14 w-14 text-muted-foreground/40" />
                    </motion.div>

                    {/* Floating Question Mark / Alert */}
                    <motion.div 
                        className="absolute -top-2 -right-2 bg-background border border-border p-2 rounded-full shadow-lg"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                        <SearchX className="h-6 w-6 text-orange-500" />
                    </motion.div>
                </motion.div>

                {/* 2. Typography */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="space-y-4"
                >
                    <h1 className="text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/50 select-none">
                        404
                    </h1>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                            <span className="text-primary">Order</span> Not Found
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed max-w-[300px] mx-auto">
                            Sorry, this item has been <span className="font-semibold italic text-foreground">86'd</span> from the menu.
                        </p>
                    </div>
                </motion.div>

                {/* 3. Action Buttons */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
                >
                    <Button 
                        size="lg" 
                        variant="default" 
                        className="w-full sm:w-auto min-w-[140px] shadow-lg shadow-primary/20 rounded-full h-12 font-bold"
                        onClick={() => navigate('/')}
                    >
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                    
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="w-full sm:w-auto min-w-[140px] rounded-full h-12 border-border/60 hover:bg-muted/50"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                </motion.div>

                {/* 4. Footer Fun */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1 }}
                    className="mt-16 text-xs text-muted-foreground/40 font-mono uppercase tracking-widest flex items-center justify-center gap-2"
                >
                    <ChefHat className="h-3 w-3" />
                    Kitchen Error: Dish_Missing
                </motion.div>

            </div>
        </div>
    )
}