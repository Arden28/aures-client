import * as React from "react"
import { 
  ShieldAlert, Users, BookOpen, ChevronLeft, Search, 
  Flame, ChevronRight, Utensils, ArrowLeft, X, ChefHat, Soup, Star 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatMoney } from "@/lib/utils"
import { type PortalCategory, type PortalProduct } from "@/api/portal"

interface DeviceBlockedScreenProps {
  tableName?: string
  restaurantName?: string
  currency?: string
  categories?: PortalCategory[]
  products?: PortalProduct[]
}

export default function DeviceBlockedScreen({ 
  tableName, 
  restaurantName,
  currency = "USD", 
  categories = [], 
  products = [] 
}: DeviceBlockedScreenProps) {
  
  const [viewMode, setViewMode] = React.useState<'blocked' | 'menu'>('blocked')

  // -- Menu Logic --
  const [activeCategory, setActiveCategory] = React.useState("popular")
  const [searchQuery, setSearchQuery] = React.useState("") 

  const categoryScrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  // Filter Logic
  const filteredProducts = React.useMemo(() => {
    // 1. Search takes absolute priority
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.description.toLowerCase().includes(query)
        )
    }

    // 2. If Popular is selected, we return EMPTY (handled by UI logic)
    if (activeCategory === "popular") return []

    // 3. Category Filter
    const catId = categories.find(c => c.slug === activeCategory)?.id
    return products.filter(p => p.category_id === catId)
  }, [products, activeCategory, categories, searchQuery])

  // Scroll Handlers
  const checkScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 300
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  React.useEffect(() => {
    const ref = categoryScrollRef.current
    if (ref) {
      ref.addEventListener('scroll', checkScroll)
      checkScroll()
    }
    return () => ref?.removeEventListener('scroll', checkScroll)
  }, [categories, viewMode])

  const clearSearch = () => setSearchQuery("")

  // -- Animations --
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  // Floating animation for Hero Icons
  const floatVariants = {
    animate: {
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: BLOCKED MESSAGE */}
        {viewMode === 'blocked' && (
          <motion.div 
            key="blocked"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 relative"
          >
             <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-red-50 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-100/50">
                <ShieldAlert className="h-10 w-10 text-red-600" />
                </div>
                
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                Table Occupied
                </h1>
                <p className="text-lg text-muted-foreground max-w-xs leading-relaxed">
                <span className="font-semibold text-foreground">{tableName || "This table"}</span> is currently being managed by another device.
                </p>
            </div>

            <div className="w-full max-w-sm space-y-4 relative z-10">
                <div className="bg-muted/40 p-4 rounded-2xl border border-border/50 flex items-start gap-4 text-left">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        <p className="font-semibold text-sm">Why am I seeing this?</p>
                        <p className="text-xs text-muted-foreground">
                            To prevent accidental double-orders, only one device can control the active tab at a time.
                        </p>
                    </div>
                </div>

                <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full h-14 rounded-xl border-2 font-bold gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                    onClick={() => window.location.reload()}
                >
                    Check Again
                </Button>

                <Button 
                    variant="ghost" 
                    className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground gap-2"
                    onClick={() => setViewMode('menu')}
                >
                    <BookOpen className="h-4 w-4" />
                    View Menu (Read Only)
                </Button>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: READ ONLY MENU */}
        {viewMode === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col h-screen overflow-hidden bg-background"
          >
            {/* Header */}
            <div className="flex-none px-4 py-4 border-b border-border/50 flex items-center gap-4 bg-background/80 backdrop-blur-md z-40">
                <Button variant="ghost" size="icon" onClick={() => setViewMode('blocked')} className="-ml-2">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="font-bold text-lg leading-none">{restaurantName || "Menu"}</h2>
                    <span className="text-xs text-muted-foreground">Read Only Mode</span>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-12">
                
                {/* Search Bar */}
                <div className="px-6 py-4 max-w-3xl mx-auto">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for dishes..." 
                            className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-transparent shadow-sm focus-visible:ring-1 focus-visible:bg-background transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories */}
                {!searchQuery && (
                    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40 py-2">
                        <div className="relative max-w-7xl mx-auto px-2 md:px-6 flex items-center">
                            {/* Left Scroll Indicator */}
                            <div className={cn(
                                "hidden md:flex absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 items-center justify-start pl-4 transition-opacity duration-300",
                                !canScrollLeft && "opacity-0 pointer-events-none"
                            )}>
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => scrollCategories('left')}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div 
                                ref={categoryScrollRef}
                                className="flex w-full overflow-x-auto gap-2 p-2 px-4 scrollbar-hide snap-x snap-mandatory"
                            >
                                <button
                                    onClick={() => setActiveCategory("popular")}
                                    className={cn(
                                    "snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 border",
                                    activeCategory === "popular"
                                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                                        : "bg-card text-muted-foreground border-border/40"
                                    )}
                                >
                                    <Flame className={cn("h-4 w-4", activeCategory === "popular" ? "text-white fill-white" : "text-orange-500 fill-orange-500")} />
                                    Home
                                </button>

                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.slug)}
                                        className={cn(
                                        "snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 border",
                                        activeCategory === cat.slug
                                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                                            : "bg-card text-muted-foreground border-border/40"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Right Scroll Indicator */}
                            <div className={cn(
                                "hidden md:flex absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 items-center justify-end pr-4 transition-opacity duration-300",
                                !canScrollRight && "opacity-0 pointer-events-none"
                            )}>
                                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => scrollCategories('right')}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-1">
                    
                    {/* SCENARIO A: SEARCH MODE */}
                    {searchQuery ? (
                        <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
                            {filteredProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="h-12 w-12 mb-2 opacity-20" />
                                    <p>No products found matching "{searchQuery}"</p>
                                </div>
                            ) : (
                                <ProductGrid products={filteredProducts} currency={currency} />
                            )}
                        </div>
                    ) : activeCategory === 'popular' ? (
                        
                        /* SCENARIO B: "POPULAR/HOME" (The Hero Animation) */
                        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
                            
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="relative mb-8"
                            >
                                {/* Center Icon */}
                                <div className="h-32 w-32 bg-gradient-to-tr from-orange-100 to-amber-50 rounded-full flex items-center justify-center shadow-2xl shadow-orange-100/50 relative z-10">
                                    <ChefHat className="h-16 w-16 text-orange-600" strokeWidth={1.5} />
                                </div>

                                {/* Floating Elements */}
                                <motion.div variants={floatVariants} animate="animate" className="absolute -top-4 -right-4 bg-white p-2 rounded-xl shadow-lg border border-orange-100">
                                    <Utensils className="h-6 w-6 text-orange-500" />
                                </motion.div>
                                <motion.div variants={floatVariants} animate="animate" style={{ animationDelay: '1s' }} className="absolute -bottom-2 -left-6 bg-white p-2 rounded-xl shadow-lg border border-orange-100">
                                    <Soup className="h-6 w-6 text-amber-500" />
                                </motion.div>
                                
                                {/* Background Pulse */}
                                <div className="absolute inset-0 bg-orange-500/10 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                            </motion.div>

                            <motion.div 
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-3 max-w-md"
                            >
                                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                                    Welcome to <span className="text-orange-600">{restaurantName || "Our Restaurant"}</span>
                                </h2>
                                <p className="text-muted-foreground text-lg leading-relaxed">
                                    Discover our culinary delights. <br className="hidden sm:block"/>
                                    Select a category from the top to explore the menu.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-8 flex gap-2"
                            >
                                <div className="flex -space-x-2">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                                            <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground self-center pl-2">
                                    Loved by locals
                                </span>
                            </motion.div>
                        </div>

                    ) : (
                        
                        /* SCENARIO C: STANDARD CATEGORY GRID */
                        <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
                            <ProductGrid products={filteredProducts} currency={currency} />
                        </div>
                    )}
                </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

/* -------------------------- Helper Component for Grid -------------------------- */

function ProductGrid({ products, currency }: { products: PortalProduct[], currency: string }) {
    
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.05 }
        }
    }
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
            {products.map((product) => (
                <motion.div 
                    variants={itemVariants}
                    key={product.id}
                    className="group relative flex sm:flex-col gap-4 p-3 md:p-4 rounded-3xl border border-border/40 bg-card/50 transition-all duration-300 overflow-hidden hover:bg-card/80"
                >
                    <div className="relative h-28 w-28 sm:h-48 sm:w-full shrink-0 overflow-hidden rounded-2xl bg-muted">
                        {product.image ? (
                            <img 
                                src={product.image} 
                                alt={product.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground">
                                <Utensils className="h-8 w-8" />
                            </div>
                        )}
                        
                        {product.is_popular && (
                            <div className="absolute left-2 top-2 rounded-full bg-orange-500/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                POPULAR
                            </div>
                        )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                        <div className="space-y-1.5">
                            <h3 className="font-bold text-lg text-foreground leading-tight line-clamp-2">
                                {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {product.description}
                            </p>
                        </div>
                        <div className="flex items-end justify-between mt-4">
                            <span className="font-bold text-lg text-primary">
                                {formatMoney(product.price, currency)}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
}