import * as React from "react"
import { 
  Search, Flame, ChevronLeft, ChevronRight, X, 
  Utensils, Plus, ChefHat, Soup, Star 
} from "lucide-react"
import { motion, AnimatePresence, type Variants } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatMoney } from "@/lib/utils"
import { type PortalCategory, type PortalProduct } from "@/api/portal"

interface ProductSectionProps {
  restaurantName?: string
  categories: PortalCategory[]
  products: PortalProduct[]
  currency: string
  canModifyOrder: boolean
  onProductClick: (product: PortalProduct) => void
}

export default function ProductSection({
  restaurantName,
  categories,
  products,
  currency,
  canModifyOrder,
  onProductClick
}: ProductSectionProps) {

  // -- State --
  const [activeCategory, setActiveCategory] = React.useState("popular")
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // -- Refs & Scroll Logic --
  const categoryScrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(true)

  // -- Filter Logic --
  const filteredProducts = React.useMemo(() => {
    // 1. Global Search Priority
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return products.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      )
    }

    // 2. "Popular" = Hero View (Return empty to skip grid rendering in the main view)
    if (activeCategory === "popular") return []

    // 3. Category Filter
    const catId = categories.find(c => c.slug === activeCategory)?.id
    return products.filter(p => p.category_id === catId)
  }, [products, activeCategory, categories, searchQuery])

  // -- Scroll Handlers --
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
  }, [categories])

  // -- Animations for Hero --
    const floatVariants: Variants = {
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
    <div className="flex-1 flex flex-col">
      
      {/* 1. Search Bar */}
      <div className="px-6 pb-2 md:pb-4 max-w-3xl mx-auto w-full">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for dishes, drinks, desserts..." 
            className="pl-10 pr-10 h-12 rounded-2xl bg-muted/30 border-transparent shadow-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Categories (Hide if searching) */}
      <AnimatePresence>
      {!searchQuery && (
        <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 py-2 overflow-hidden"
        >
          <div className="relative max-w-7xl mx-auto px-2 md:px-6 flex items-center">
            
            {/* Left Gradient */}
            <div className={cn(
              "hidden md:flex absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 items-center justify-start pl-4 transition-opacity duration-300",
              !canScrollLeft && "opacity-0 pointer-events-none"
            )}>
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full shadow-md" onClick={() => scrollCategories('left')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable Container */}
            <div 
              ref={categoryScrollRef}
              className="flex w-full overflow-x-auto gap-2 p-2 px-4 scrollbar-hide snap-x snap-mandatory"
            >
              <button
                onClick={() => setActiveCategory("popular")}
                className={cn(
                  "snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 border",
                  activeCategory === "popular"
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-100"
                    : "bg-card text-muted-foreground border-border/40 hover:bg-accent hover:text-foreground"
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
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-100"
                      : "bg-card text-muted-foreground border-border/40 hover:bg-accent hover:text-foreground"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Right Gradient */}
            <div className={cn(
              "hidden md:flex absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 items-center justify-end pr-4 transition-opacity duration-300",
              !canScrollRight && "opacity-0 pointer-events-none"
            )}>
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full shadow-md" onClick={() => scrollCategories('right')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* 3. Content Area */}
      <div className="flex-1">
        {searchQuery ? (
           /* --- SCENARIO A: SEARCH RESULTS --- */
           <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
             {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-in fade-in slide-in-from-bottom-4">
                    <Search className="h-12 w-12 mb-2 opacity-20" />
                    <p>No products found matching "{searchQuery}"</p>
                </div>
             ) : (
                <ProductGrid 
                    // ✅ KEY FIX: Force remount on search change
                    key="search-grid"
                    products={filteredProducts} 
                    currency={currency} 
                    canModifyOrder={canModifyOrder} 
                    onProductClick={onProductClick} 
                />
             )}
           </div>
        ) : activeCategory === 'popular' ? (
            
            /* --- SCENARIO B: HERO / WELCOME SECTION --- */
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in duration-700">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative mb-8"
                >
                    <div className="h-32 w-32 bg-gradient-to-tr from-orange-100 to-amber-50 rounded-full flex items-center justify-center shadow-2xl shadow-orange-100/50 relative z-10">
                        <ChefHat className="h-16 w-16 text-orange-600" strokeWidth={1.5} />
                    </div>

                    <motion.div variants={floatVariants} animate="animate" className="absolute -top-4 -right-4 bg-white p-2 rounded-xl shadow-lg border border-orange-100">
                        <Utensils className="h-6 w-6 text-orange-500" />
                    </motion.div>
                    <motion.div variants={floatVariants} animate="animate" style={{ animationDelay: '1s' }} className="absolute -bottom-2 -left-6 bg-white p-2 rounded-xl shadow-lg border border-orange-100">
                        <Soup className="h-6 w-6 text-amber-500" />
                    </motion.div>
                    
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
            /* --- SCENARIO C: REGULAR CATEGORY GRID --- */
            <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
                <div className="mb-6 flex flex-col gap-1 animate-in fade-in slide-in-from-left-4">
                    <h2 className="text-2xl font-bold tracking-tight capitalize">
                        {categories.find(c => c.slug === activeCategory)?.name || "Menu"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {filteredProducts.length} items available
                    </p>
                </div>
                <ProductGrid 
                    // ✅ KEY FIX: Force remount when category changes so animation plays
                    key={activeCategory} 
                    products={filteredProducts} 
                    currency={currency} 
                    canModifyOrder={canModifyOrder} 
                    onProductClick={onProductClick} 
                />
            </div>
        )}
      </div>
    </div>
  )
}

/* --- Internal Grid Component for Reusability --- */
function ProductGrid({ 
    products, 
    currency, 
    canModifyOrder, 
    onProductClick 
}: { 
    products: PortalProduct[], 
    currency: string, 
    canModifyOrder: boolean, 
    onProductClick: (p: PortalProduct) => void 
}) {
    
    // Animation variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: { 
            opacity: 1, 
            transition: { 
                staggerChildren: 0.05 
            } 
        }
    }
    
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { 
            opacity: 1, 
            y: 0, 
            transition: { 
                type: "spring", 
                stiffness: 300, 
                damping: 24 
            } 
        }
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
                    onClick={() => onProductClick(product)}
                    className={cn(
                        "group relative flex sm:flex-col gap-4 p-3 md:p-4 rounded-3xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden",
                        !canModifyOrder && "opacity-60 grayscale-[0.5] cursor-not-allowed"
                    )}
                >
                    <div className="relative h-28 w-28 sm:h-48 sm:w-full shrink-0 overflow-hidden rounded-2xl bg-muted">
                        {product.image ? (
                            <img 
                                src={product.image} 
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                            <h3 className="font-bold text-lg text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
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
                            {canModifyOrder && (
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                    <Plus className="h-4 w-4" />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
}