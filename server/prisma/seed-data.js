const unsplash = (photoId) =>
  `https://images.unsplash.com/${photoId}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080`

const triple = (url) => [url, url, url]

export const users = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'admin@techstore.local',
    password: 'Admin123!',
    role: 'admin',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email: 'customer@techstore.local',
    password: 'Customer123!',
    role: 'customer',
  },
]

export const promoCodes = [
  {
    code: 'SAVE10',
    discountPercentage: 10,
    isActive: true,
  },
  {
    code: 'WELCOME5',
    discountPercentage: 5,
    isActive: true,
  },
]

export const products = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    title: 'Premium Wireless Headphones',
    subtitle: 'Noise isolation and premium sound',
    description: 'Over-ear wireless headphones with long battery life.',
    longDescription:
      'Premium drivers and adaptive noise isolation help you stay focused. Comfortable ear cushions for long listening sessions.',
    price: 299.99,
    rating: 4.8,
    category: 'Audio',
    images: triple(unsplash('photo-1760708368699-69cb9ed56f52')),
    reviewCount: 892,
    highlights: [
      { label: 'Driver Size', value: '40 mm' },
      { label: 'Battery Life', value: '40 hours' },
      { label: 'ANC', value: 'Hybrid' },
    ],
    specifications:
      'Impedance: 32 Ohm.\nSensitivity: 102 dB.\nBluetooth 5.2 multipoint.\nWeight: 265 g.',
    freeShipping: true,
    stockQuantity: 24,
    createdAt: new Date('2026-10-01T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000002',
    title: 'Professional Laptop Pro',
    subtitle: 'High performance for creators',
    description: 'Desktop-class power in a portable form factor.',
    longDescription:
      'High-performance CPU and GPU for development, design, and content creation. Bright high-resolution display.',
    price: 1899.99,
    rating: 4.6,
    category: 'Computers',
    images: triple(unsplash('photo-1673431738089-c4fc9c2e96a7')),
    reviewCount: 412,
    highlights: [
      { label: 'Display', value: '16" 3.2K' },
      { label: 'Memory', value: '32 GB' },
      { label: 'Storage', value: '1 TB SSD' },
    ],
    specifications:
      'Processor: latest generation mobile H-series.\nGraphics: discrete GPU with 8 GB VRAM.\nPorts: Thunderbolt 4, HDMI, USB-A.\nWeight: from 2.1 kg.',
    freeShipping: true,
    stockQuantity: 11,
    createdAt: new Date('2026-10-02T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000003',
    title: 'Smart Fitness Watch Ultra',
    subtitle: 'Health tracking and durable design',
    description: 'Advanced sensors for training and wellness.',
    longDescription:
      'Track workouts, sleep, and vitals with all-day battery. Rugged build for outdoor use.',
    price: 449.99,
    rating: 4.4,
    category: 'Wearables',
    images: triple(unsplash('photo-1665860455418-017fa50d29bc')),
    reviewCount: 1203,
    highlights: [
      { label: 'Display', value: 'AMOLED 1.5"' },
      { label: 'GPS', value: 'Dual-band' },
      { label: 'Water', value: '5 ATM' },
    ],
    specifications:
      'Sensors: heart rate, SpO2, temperature.\nBattery life: up to 14 days (typical use).\nCompatibility: iOS and Android.\nCase: titanium / aluminum options.',
    freeShipping: true,
    stockQuantity: 38,
    createdAt: new Date('2026-10-03T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000004',
    title: 'Professional DSLR Camera',
    subtitle: 'Full-frame sensor and pro optics',
    description: 'Professional photography and video workflows.',
    longDescription:
      'Designed for creators who need reliable performance in studio and on location. Advanced autofocus and high dynamic range.',
    price: 2499.99,
    rating: 4.9,
    category: 'Photography',
    images: triple(unsplash('photo-1532272278764-53cd1fe53f72')),
    reviewCount: 156,
    highlights: [
      { label: 'Sensor', value: 'Full-frame 24 MP' },
      { label: 'ISO Range', value: '100-51200' },
      { label: 'Video', value: '4K 60p' },
    ],
    specifications:
      'Lens mount: proprietary bayonet.\nStorage: dual SD slots.\nWeather sealing: yes.\nBattery life (CIPA): approx. 900 shots.',
    freeShipping: true,
    stockQuantity: 5,
    createdAt: new Date('2026-10-04T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000005',
    title: 'Portable Bluetooth Speaker',
    subtitle: 'Portable audio with rich bass',
    description: 'Compact speaker for travel and outdoor use.',
    longDescription:
      'Take your music anywhere with this powerful portable speaker. Delivers rich, immersive sound with deep bass. Waterproof design perfect for outdoor adventures and pool parties.',
    price: 129.99,
    rating: 4.2,
    category: 'Audio',
    images: triple(unsplash('photo-1674303324806-7018a739ed11')),
    reviewCount: 327,
    highlights: [
      { label: 'Output Power', value: '20W' },
      { label: 'Battery Life', value: '15 hours' },
      { label: 'Water Rating', value: 'IPX7' },
    ],
    specifications:
      'Bluetooth 5.3 with AAC and SBC codecs.\nFrequency response: 60 Hz - 20 kHz.\nCharging: USB-C, approx. 2.5 hours to full charge.\nDimensions: 180 x 72 x 72 mm.\nWeight: 580 g.',
    freeShipping: true,
    stockQuantity: 64,
    createdAt: new Date('2026-10-05T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000006',
    title: 'Ultra-Thin Tablet Pro',
    subtitle: 'Vivid display for work and media',
    description: 'Thin profile with all-day battery.',
    longDescription:
      'Large color-accurate display for reading, sketching, and video. Stereo speakers and fast charging.',
    price: 799.99,
    rating: 4.5,
    category: 'Tablets',
    images: triple(unsplash('photo-1740637977676-c8040b41dc7a')),
    reviewCount: 267,
    highlights: [
      { label: 'Display', value: '12.9" OLED' },
      { label: 'Refresh', value: '120 Hz' },
      { label: 'Stylus', value: 'Included' },
    ],
    specifications:
      'Resolution: 2732 x 2048 pixels.\nChip: flagship mobile SoC.\nStorage: 256 GB / 512 GB / 1 TB.\nAccessories: keyboard cover optional.',
    freeShipping: true,
    stockQuantity: 19,
    createdAt: new Date('2026-10-06T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000007',
    title: 'RGB Mechanical Keyboard',
    subtitle: 'Tactile switches and per-key lighting',
    description: 'Mechanical keyboard for gaming and daily typing.',
    longDescription:
      'Hot-swappable switches, aluminium frame, and per-key RGB lighting. Detachable USB-C cable and on-board profiles.',
    price: 159.99,
    rating: 4.7,
    category: 'Gaming',
    images: triple(unsplash('photo-1595225476474-87563907a212')),
    reviewCount: 534,
    highlights: [
      { label: 'Layout', value: '75%' },
      { label: 'Switches', value: 'Hot-swap' },
      { label: 'Connection', value: 'USB-C / 2.4 GHz' },
    ],
    specifications:
      'Keycaps: PBT double-shot.\nPolling rate: 1000 Hz.\nBattery: 4000 mAh.\nWeight: 820 g.',
    freeShipping: true,
    stockQuantity: 45,
    createdAt: new Date('2026-10-07T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000008',
    title: 'Wireless Gaming Mouse',
    subtitle: 'Lightweight precision for competitive play',
    description: 'Low-latency wireless mouse with a 26K sensor.',
    longDescription:
      'A 58-gram shell, optical switches, and a high-precision sensor. Up to 90 hours of battery life on a single charge.',
    price: 89.99,
    rating: 4.6,
    category: 'Gaming',
    images: triple(unsplash('photo-1527814050087-3793815479db')),
    reviewCount: 761,
    highlights: [
      { label: 'Sensor', value: '26 000 DPI' },
      { label: 'Weight', value: '58 g' },
      { label: 'Battery', value: '90 hours' },
    ],
    specifications:
      'Switches: optical.\nConnection: 2.4 GHz / Bluetooth.\nCable: paracord USB-C.\nFeet: PTFE.',
    freeShipping: true,
    stockQuantity: 72,
    createdAt: new Date('2026-10-08T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000009',
    title: '4K Creator Monitor',
    subtitle: 'Colour-accurate panel for studio work',
    description: '27-inch 4K display with USB-C power delivery.',
    longDescription:
      'Factory-calibrated 4K IPS panel covering 99% of DCI-P3. Single-cable docking with 90 W power delivery.',
    price: 649.99,
    rating: 4.5,
    category: 'Computers',
    images: triple(unsplash('photo-1527443224154-c4a3942d3acf')),
    reviewCount: 188,
    highlights: [
      { label: 'Panel', value: '27" IPS 4K' },
      { label: 'Colour', value: '99% DCI-P3' },
      { label: 'USB-C', value: '90 W PD' },
    ],
    specifications:
      'Resolution: 3840 x 2160.\nRefresh rate: 60 Hz.\nPorts: USB-C, HDMI 2.1, DisplayPort 1.4.\nStand: height and tilt adjustable.',
    freeShipping: true,
    stockQuantity: 14,
    createdAt: new Date('2026-10-09T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000010',
    title: 'Flagship Smartphone X',
    subtitle: 'Titanium body and computational photography',
    description: 'Flagship phone with a bright 120 Hz display.',
    longDescription:
      'A premium smartphone with a triple camera system, all-day battery, and fast wired and wireless charging.',
    price: 1099.99,
    rating: 4.7,
    category: 'Phones',
    images: triple(unsplash('photo-1511707171634-5f897ff02aa9')),
    reviewCount: 2140,
    highlights: [
      { label: 'Display', value: '6.7" LTPO' },
      { label: 'Camera', value: '48 MP triple' },
      { label: 'Battery', value: '5000 mAh' },
    ],
    specifications:
      'Chip: 3 nm flagship SoC.\nStorage: 256 GB / 512 GB.\nWater resistance: IP68.\nCharging: 65 W wired, 30 W wireless.',
    freeShipping: true,
    stockQuantity: 27,
    createdAt: new Date('2026-10-10T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000011',
    title: 'Foldable Camera Drone',
    subtitle: '4K aerial video in a compact body',
    description: 'Foldable drone with obstacle avoidance and 4K video.',
    longDescription:
      'Capture smooth aerial footage with a three-axis gimbal and intelligent flight modes. Under 249 g for easier travel.',
    price: 899.99,
    rating: 4.4,
    category: 'Photography',
    images: triple(unsplash('photo-1473968512647-3e447244af8f')),
    reviewCount: 96,
    highlights: [
      { label: 'Camera', value: '4K 60 fps' },
      { label: 'Flight', value: '34 min' },
      { label: 'Weight', value: '249 g' },
    ],
    specifications:
      'Sensor: 1/1.3-inch CMOS.\nGimbal: 3-axis.\nRange: up to 10 km.\nStorage: 128 GB internal.',
    freeShipping: true,
    stockQuantity: 0,
    createdAt: new Date('2026-10-11T09:00:00.000Z'),
  },
  {
    id: '11111111-1111-4111-8111-000000000012',
    title: 'VR Headset Pro',
    subtitle: 'Immersive mixed reality with inside-out tracking',
    description: 'Standalone VR headset with dual 4K displays.',
    longDescription:
      'High-resolution displays, precise inside-out tracking, and a comfortable balanced head strap for long sessions.',
    price: 549.99,
    rating: 4.3,
    category: 'Gaming',
    images: triple(unsplash('photo-1622979135225-d2ba269cf1ac')),
    reviewCount: 143,
    highlights: [
      { label: 'Display', value: 'Dual 4K' },
      { label: 'Refresh', value: '120 Hz' },
      { label: 'Tracking', value: 'Inside-out' },
    ],
    specifications:
      'Storage: 256 GB.\nBattery: approx. 3 hours.\nControllers: 6DoF.\nWeight: 515 g.',
    freeShipping: true,
    stockQuantity: 9,
    createdAt: new Date('2026-10-12T09:00:00.000Z'),
  },
]
