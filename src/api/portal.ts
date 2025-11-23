import apiService from "@/api/apiService"

/* -------------------------- Types -------------------------- */

export type PortalCategory = {
  id: number
  name: string
  slug: string
  image?: string
}

export type PortalProduct = {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  image: string
  is_available: boolean
  is_popular?: boolean
  calories?: number
}

export type PortalCartItem = {
  tempId: string
  product: PortalProduct
  quantity: number
  notes?: string
}

export type TableSession = {
  id: string
  table_name: string
  restaurant_name: string
  currency: string
}

/* ------------------------ Mock Data ------------------------ */

const MOCK_CATEGORIES: PortalCategory[] = [
  { id: 1, name: "Popular", slug: "popular" },
  { id: 2, name: "Starters", slug: "starters" },
  { id: 3, name: "Mains", slug: "mains" },
  { id: 4, name: "Burgers", slug: "burgers" },
  { id: 5, name: "Drinks", slug: "drinks" },
  { id: 6, name: "Desserts", slug: "desserts" },
]

const MOCK_PRODUCTS: PortalProduct[] = [
  {
    id: 101,
    category_id: 2,
    name: "Crispy Calamari",
    description: "Served with garlic aioli and lemon wedges.",
    price: 1200,
    image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=400&q=80",
    is_available: true,
    is_popular: true,
    calories: 450
  },
  {
    id: 102,
    category_id: 4,
    name: "Truffle Mushroom Burger",
    description: "Double smashed patty, truffle mayo, swiss cheese, brioche bun.",
    price: 1850,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
    is_available: true,
    is_popular: true,
    calories: 850
  },
  {
    id: 103,
    category_id: 3,
    name: "Grilled Salmon",
    description: "With asparagus, quinoa, and lemon butter sauce.",
    price: 2400,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=400&q=80",
    is_available: true,
    calories: 620
  },
  {
    id: 104,
    category_id: 5,
    name: "Iced Matcha Latte",
    description: "Premium ceremonial grade matcha with oat milk.",
    price: 650,
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=400&q=80",
    is_available: true,
    calories: 120
  },
  {
    id: 105,
    category_id: 4,
    name: "Classic Cheeseburger",
    description: "Angus beef, cheddar, lettuce, tomato, house sauce.",
    price: 1500,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80",
    is_available: true
  },
  {
    id: 106,
    category_id: 6,
    name: "Molten Chocolate Cake",
    description: "Warm chocolate fondant with vanilla bean ice cream.",
    price: 950,
    image: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=400&q=80",
    is_available: true,
    is_popular: true
  }
]

/* --------------------------- API --------------------------- */

export async function fetchPortalSession(tableCode: string): Promise<TableSession> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return {
    id: "sess_123",
    table_name: "Table 12",
    restaurant_name: "The Gourmet Spot",
    currency: "KES"
  }
}

export async function fetchPortalMenu(tableCode: string) {
  await new Promise(resolve => setTimeout(resolve, 600))
  return {
    categories: MOCK_CATEGORIES,
    products: MOCK_PRODUCTS
  }
}

export async function placePortalOrder(session: TableSession, items: PortalCartItem[]) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  return { success: true, order_id: Math.floor(Math.random() * 10000) }
}