const triple = (url) => [url, url, url]

export const productsMock = [
  {
    id: '5',
    title: 'Portable Bluetooth Speaker',
    subtitle: 'Portable audio with rich bass',
    price: 129.99,
    rating: 3.5,
    category: 'Audio',
    image:
      'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    images: triple(
      'https://images.unsplash.com/photo-1674303324806-7018a739ed11?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ),
    description: 'Compact speaker for travel and outdoor use.',
    longDescription:
      'Take your music anywhere with this powerful portable speaker. Delivers rich, immersive sound with deep bass. Waterproof design perfect for outdoor adventures and pool parties.',
    reviewCount: 327,
    highlights: [
      { label: 'Output Power', value: '20W' },
      { label: 'Battery Life', value: '15 hours' },
      { label: 'Water Rating', value: 'IPX7' },
    ],
    specifications: `Bluetooth 5.3 with AAC and SBC codecs.
Frequency response: 60 Hz – 20 kHz.
Charging: USB-C, approx. 2.5 hours to full charge.
Dimensions: 180 × 72 × 72 mm.
Weight: 580 g.`,
    freeShipping: true,
  },
  {
    id: '1',
    title: 'Premium Wireless Headphones',
    subtitle: 'Noise isolation and premium sound',
    price: 299.99,
    rating: 5,
    category: 'Audio',
    image:
      'https://images.unsplash.com/photo-1760708368699-69cb9ed56f52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    images: triple(
      'https://images.unsplash.com/photo-1760708368699-69cb9ed56f52?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ),
    description: 'Over-ear wireless headphones with long battery life.',
    longDescription:
      'Premium drivers and adaptive noise isolation help you stay focused. Comfortable ear cushions for long listening sessions.',
    reviewCount: 892,
    highlights: [
      { label: 'Driver Size', value: '40 mm' },
      { label: 'Battery Life', value: '40 hours' },
      { label: 'ANC', value: 'Hybrid' },
    ],
    specifications: `Impedance: 32 Ohm.
Sensitivity: 102 dB.
Bluetooth 5.2 multipoint.
Weight: 265 g.`,
    freeShipping: true,
  },
  {
    id: '4',
    title: 'Professional DSLR Camera',
    subtitle: 'Full-frame sensor and pro optics',
    price: 2499.99,
    rating: 5,
    category: 'Photography',
    image:
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    images: triple(
      'https://images.unsplash.com/photo-1532272278764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ),
    description: 'Professional photography and video workflows.',
    longDescription:
      'Designed for creators who need reliable performance in studio and on location. Advanced autofocus and high dynamic range.',
    reviewCount: 156,
    highlights: [
      { label: 'Sensor', value: 'Full-frame 24 MP' },
      { label: 'ISO Range', value: '100–51200' },
      { label: 'Video', value: '4K 60p' },
    ],
    specifications: `Lens mount: proprietary bayonet.
Storage: dual SD slots.
Weather sealing: yes.
Battery life (CIPA): approx. 900 shots.`,
    freeShipping: true,
  },
  {
    id: '2',
    title: 'Professional Laptop Pro',
    subtitle: 'High performance for creators',
    price: 1899.99,
    rating: 4.5,
    category: 'Computers',
    image:
      'https://images.unsplash.com/photo-1673431738089-c4fc9c2e96a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    images: triple(
      'https://images.unsplash.com/photo-1673431738089-c4fc9c2e96a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ),
    description: 'Desktop-class power in a portable form factor.',
    longDescription:
      'High-performance CPU and GPU for development, design, and content creation. Bright high-resolution display.',
    reviewCount: 412,
    highlights: [
      { label: 'Display', value: '16" 3.2K' },
      { label: 'Memory', value: '32 GB' },
      { label: 'Storage', value: '1 TB SSD' },
    ],
    specifications: `Processor: latest generation mobile H-series.
Graphics: discrete GPU with 8 GB VRAM.
Ports: Thunderbolt 4, HDMI, USB-A.
Weight: from 2.1 kg.`,
    freeShipping: true,
  },
  {
    id: '3',
    title: 'Smart Fitness Watch Ultra',
    subtitle: 'Health tracking and durable design',
    price: 449.99,
    rating: 4,
    category: 'Wearables',
    image:
      'https://images.unsplash.com/photo-1665860455418-017fa50d29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    images: triple(
      'https://images.unsplash.com/photo-1665860455418-017fa50d29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ),
    description: 'Advanced sensors for training and wellness.',
    longDescription:
      'Track workouts, sleep, and vitals with all-day battery. Rugged build for outdoor use.',
    reviewCount: 1203,
    highlights: [
      { label: 'Display', value: 'AMOLED 1.5"' },
      { label: 'GPS', value: 'Dual-band' },
      { label: 'Water', value: '5 ATM' },
    ],
    specifications: `Sensors: heart rate, SpO₂, temperature.
Battery life: up to 14 days (typical use).
Compatibility: iOS and Android.
Case: titanium / aluminum options.`,
    freeShipping: true,
  },
  {
    id: '6',
    title: 'Ultra-Thin Tablet Pro',
    subtitle: 'Vivid display for work and media',
    price: 799.99,
    rating: 4.5,
    category: 'Tablets',
    image:
      'https://images.unsplash.com/photo-1740637977676-c8040b41dc7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    images: triple(
      'https://images.unsplash.com/photo-1740637977676-c8040b41dc7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ),
    description: 'Thin profile with all-day battery.',
    longDescription:
      'Large color-accurate display for reading, sketching, and video. Stereo speakers and fast charging.',
    reviewCount: 267,
    highlights: [
      { label: 'Display', value: '12.9" OLED' },
      { label: 'Refresh', value: '120 Hz' },
      { label: 'Stylus', value: 'Included' },
    ],
    specifications: `Resolution: 2732 × 2048 pixels.
Chip: flagship mobile SoC.
Storage: 256 GB / 512 GB / 1 TB.
Accessories: keyboard cover optional.`,
    freeShipping: true,
  },
]

const CATEGORY_ORDER = ['Audio', 'Computers', 'Wearables', 'Photography', 'Tablets']

export function getProductById(productId) {
  return productsMock.find((p) => String(p.id) === String(productId)) ?? null
}

export function getRelatedProducts(productId, limit = 3) {
  const current = getProductById(productId)
  if (!current) return []
  const others = productsMock.filter((p) => p.id !== current.id)
  const same = others.filter((p) => p.category === current.category)
  const rest = others.filter((p) => p.category !== current.category)
  const merged = [...same, ...rest]
  return merged.slice(0, limit)
}

export function getCategoryTiles() {
  const byName = new Map()
  for (const p of productsMock) {
    if (!byName.has(p.category)) {
      byName.set(p.category, { name: p.category, count: 0, image: p.image })
    }
    const row = byName.get(p.category)
    row.count += 1
  }
  return CATEGORY_ORDER.filter((name) => byName.has(name)).map((name) => byName.get(name))
}
