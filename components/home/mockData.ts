export type CarItem = {
  id: string;
  name: string;
  url_key: string;
  media_src: string;
  media_alt: string;
  media_images?: Array<{ src: string; alt: string }>;
  transmission: string;
  fuelType: string;
  mileage: string;
  seating_capacity: number;
  regularRateDaily: number;
  dailyRate: number;
  isvipNumberPlate?: boolean;
  /** Wishlist flag from API (search.component / vehicle list). */
  is_wishlist?: boolean;
};

export type YachtItem = {
  id: string;
  name: string;
  url_key: string;
  media_src: string;
  media_alt: string;
  media_images?: Array<{ src: string; alt: string }>;
  bodyType: string;
  year: string;
  length: string;
  guest_capacity: number;
  regularRateHourly: number;
  hourlyRate: number;
  isvipNumberPlate?: boolean;
  is_wishlist?: boolean;
};

export type BrandItem = {
  name: string;
  url_key: string;
  image: string;
};

export type CarType = {
  name: string;
  url_key: string;
  title: string;
  image: string;
  alt: string;
};

export const ourCarCollections: CarItem[] = [
  {
    id: "1",
    name: "BMW X5",
    url_key: "bmw-x5",
    media_src: "bmw-x5-thumbnail-20260130092206.webp",
    media_alt: "BMW X5 rental Dubai",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "250",
    seating_capacity: 5,
    regularRateDaily: 1299,
    dailyRate: 999,
    isvipNumberPlate: true,
  },
  {
    id: "2",
    name: "Mercedes-Benz S500",
    url_key: "mercedes-s500",
    media_src: "rent-mercedes-benz-s500-in-dubai-20260114132804.webp",
    media_alt: "Mercedes-Benz S500 rental Dubai",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "250",
    seating_capacity: 5,
    regularRateDaily: 1899,
    dailyRate: 1399,
  },
  {
    id: "3",
    name: "BMW 735i",
    url_key: "bmw-735i",
    media_src: "bmw-735i-rental-dubai-20260114132103.webp",
    media_alt: "BMW 735i rental Dubai",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "250",
    seating_capacity: 5,
    regularRateDaily: 1599,
    dailyRate: 1199,
  },
  {
    id: "4",
    name: "Toyota Land Cruiser",
    url_key: "toyota-land-cruiser",
    media_src: "rent-toyota-land-cruiser-dubai-20260114132502.webp",
    media_alt: "Toyota Land Cruiser rental Dubai",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "250",
    seating_capacity: 7,
    regularRateDaily: 1499,
    dailyRate: 1099,
  },
  {
    id: "5",
    name: "Jetour T2",
    url_key: "jetour-t2",
    media_src: "jetour-t2-rental-dubai-20260114133249.webp",
    media_alt: "Jetour T2 rental Dubai",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "250",
    seating_capacity: 5,
    regularRateDaily: 899,
    dailyRate: 699,
  },
  {
    id: "6",
    name: "Ghost Rox",
    url_key: "rox",
    media_src: "rox-car-rental-dubai-20260114132306.webp",
    media_alt: "Ghost Rox rental Dubai",
    transmission: "Automatic",
    fuelType: "Petrol",
    mileage: "250",
    seating_capacity: 5,
    regularRateDaily: 1199,
    dailyRate: 899,
  },
];

export const ourYachtsCollections: YachtItem[] = [
  {
    id: "y1",
    name: "Black Predator 105",
    url_key: "black-predator-105",
    media_src: "black-predator-105-0-20250927144830.webp",
    media_alt: "Black Predator 105 yacht rental Dubai",
    bodyType: "Sport Yacht",
    year: "2021",
    length: "105 ft",
    guest_capacity: 30,
    regularRateHourly: 3999,
    hourlyRate: 2999,
  },
  {
    id: "y2",
    name: "Lamborghini Yacht",
    url_key: "lamborghini-yacht",
    media_src: "lamborghini-yacht-rental-in-dubai-0-20250927144442.webp",
    media_alt: "Lamborghini yacht rental Dubai",
    bodyType: "Luxury Yacht",
    year: "2022",
    length: "63 ft",
    guest_capacity: 12,
    regularRateHourly: 4999,
    hourlyRate: 3499,
  },
  {
    id: "y3",
    name: "Riva 750",
    url_key: "riva-750",
    media_src: "riva-750-yacht-rental-dubai-0-20250927145045.webp",
    media_alt: "Riva 750 yacht rental Dubai",
    bodyType: "Luxury Yacht",
    year: "2020",
    length: "75 ft",
    guest_capacity: 25,
    regularRateHourly: 2899,
    hourlyRate: 2199,
  },
  {
    id: "y4",
    name: "Montclaire X70",
    url_key: "montclaire-x70",
    media_src: "rent-montclaire-x70-yacht-in-dubai-0-20250927145246.webp",
    media_alt: "Montclaire X70 yacht rental Dubai",
    bodyType: "Super Yacht",
    year: "2023",
    length: "70 ft",
    guest_capacity: 20,
    regularRateHourly: 3299,
    hourlyRate: 2499,
  },
  {
    id: "y5",
    name: "Carpe Diem Prestige X250",
    url_key: "carpe-diem-prestige-x250",
    media_src: "rent-the-carpe-diem-prestige-x-250-yacht-in-dubai-0-20250927145457.webp",
    media_alt: "Carpe Diem Prestige X250 yacht rental Dubai",
    bodyType: "Luxury Yacht",
    year: "2022",
    length: "80 ft",
    guest_capacity: 22,
    regularRateHourly: 3599,
    hourlyRate: 2699,
  },
  {
    id: "y6",
    name: "Diamond Stellar 70",
    url_key: "diamond-stellar-70",
    media_src: "diamond-stellar-70-yacht-rental-dubai-0-20250927150038.webp",
    media_alt: "Diamond Stellar 70 yacht rental Dubai",
    bodyType: "Luxury Yacht",
    year: "2021",
    length: "70 ft",
    guest_capacity: 18,
    regularRateHourly: 2499,
    hourlyRate: 1899,
  },
];

/** Match home carousel loop (needs enough slides); API can return fewer. */
export const trendingRentalCars: CarItem[] = ourCarCollections.slice(0, 6);

export const carTypes: CarType[] = [
  {
    name: "SUV",
    url_key: "suv",
    title: "Luxury SUV Rentals in Dubai",
    image: "suv-20260122172827.png",
    alt: "Luxury SUV rental Dubai",
  },
  {
    name: "Sedan",
    url_key: "sedan",
    title: "Sedan Rentals in Dubai",
    image: "sedan-cars-on-rent-from-ghost-rentals-dubai-20250927111506.webp",
    alt: "Sedan rental Dubai",
  },
  {
    name: "Coupe",
    url_key: "coupe",
    title: "Coupe Rentals in Dubai",
    image: "coupe-cars-rentals-from-ghost-rentals-dubai-20250927111658.webp",
    alt: "Coupe rental Dubai",
  },
  {
    name: "Convertible",
    url_key: "convertible",
    title: "Convertible Rentals in Dubai",
    image: "rent-covertible-cars-from-ghost-rentals-in-dubai-20250927111214.webp",
    alt: "Convertible rental Dubai",
  },
  {
    name: "Mini",
    url_key: "mini",
    title: "Mini Rentals in Dubai",
    image: "rent-a-mini-car-from-ghost-rentals-dubai-20250927111108.webp",
    alt: "Mini rental Dubai",
  },
  {
    name: "Van",
    url_key: "van",
    title: "Van Rentals in Dubai",
    image: "van-20260122173141.png",
    alt: "Van rental Dubai",
  },
];

export const brands: BrandItem[] = [
  { name: "Audi", url_key: "audi", image: "audi-new-logo-20260108094958.svg" },
  { name: "BMW", url_key: "bmw", image: "bmw-2-20260108094138.svg" },
  { name: "Bentley", url_key: "bentley", image: "bentley-motors-2-20260108155752.svg" },
  { name: "Bugatti", url_key: "bugatti", image: "bugatti-2-20260108155640.svg" },
  { name: "BYD", url_key: "byd", image: "byd-auto-logo-1-20260108100441.svg" },
  { name: "Cadillac", url_key: "cadillac", image: "cadillac-1-20260108100401.svg" },
  { name: "Chevrolet", url_key: "chevrolet", image: "chevrolet-11-20260108093653.svg" },
  { name: "Corvette", url_key: "corvette", image: "corvette-racing-logo-brandlogos.net_tt33kjua1-20260108100939.svg" },
  { name: "Dodge", url_key: "dodge", image: "dodge-20260108155614.svg" },
  { name: "Ferrari", url_key: "ferrari", image: "ferrari-ges-20260108160210.svg" },
  { name: "Ford", url_key: "ford", image: "ford-logo-flat-20260108094851.svg" },
  { name: "GMC", url_key: "gmc", image: "gmc-1979-2014-logo-brandlogos.net_68azv2kip-20260108101045.svg" },
  { name: "GWM", url_key: "gwm", image: "gwm-1-20260108092717.svg" },
  { name: "Hummer", url_key: "hummer", image: "hummer-logo-20260108100724.svg" },
  { name: "Jaguar", url_key: "jaguar", image: "jaguar-cars-20260108095335.svg" },
];

export const features = [
  {
    image: "images/icons/hire-luxury-cars-from-ghost-rentals-dubai.webp",
    alt: "Luxury Cars",
    title: "Luxury Cars for Rent in Dubai",
    description: "Luxury Cars and Yacht rentals suitable for family use.",
  },
  {
    image: "images/icons/trusted-car-rental-services-from-ghost-rentals.webp",
    alt: "Top Rental Service Provider",
    title: "Top Rated Car Rental Service in Dubai",
    description: "Building lasting relationships through exceptional service.",
  },
  {
    image: "images/icons/247-white.svg",
    alt: "24/7 Rental Services",
    title: "24/7 Cars Available for Rent in Dubai",
    description: "Instant booking with 24/7 service assistance.",
  },
  {
    image: "images/icons/map-white.svg",
    alt: "Car Rental Services Available Across UAE",
    title: "Luxury Car Rental Services Available Throughout the UAE",
    description: "Enjoy seamless doorstep delivery across the UAE.",
  },
];

export const topCategories = [
  { name: "Luxury SUVs", url_key: "luxury-suv" },
  { name: "Sports Cars", url_key: "sports" },
  { name: "Convertibles", url_key: "convertible" },
  { name: "Yachts", url_key: "yacht" },
  { name: "Chauffeur", url_key: "chauffeur" },
];

export const trendingSearchBrands = brands.slice(0, 6);

export function formatAED(amount: number): string {
  return `AED ${amount.toLocaleString("en-US")}`;
}

export type GoogleReview = {
  author_name: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  author_url: string;
};

export const googleSummary = {
  rating: 4.9,
  totalReviews: 612,
  mapUrl:
    "https://www.google.com/maps/place/Ghost+Rentals/@25.12,55.2,15z",
};

export const googleReviews: GoogleReview[] = [
  {
    author_name: "Dorai Harrison",
    profile_photo_url:
      "https://ui-avatars.com/api/?name=Dorai+Harrison&background=1d1d1d&color=e4c98a&bold=true",
    rating: 5,
    relative_time_description: "2 weeks ago",
    text: "Rented a Rolls-Royce for my wedding, and everything was flawless. The car was immaculate, the chauffeur was professional, and the whole process was seamless.",
    author_url: "https://www.google.com/maps/contrib/",
  },
  {
    author_name: "Sarah Johnson",
    profile_photo_url:
      "https://ui-avatars.com/api/?name=Sarah+Johnson&background=1d1d1d&color=e4c98a&bold=true",
    rating: 5,
    relative_time_description: "1 month ago",
    text: "We booked multiple luxury cars for our corporate event. Ghost Rentals delivered on time, with pristine vehicles and white-glove service. Highly recommended.",
    author_url: "https://www.google.com/maps/contrib/",
  },
  {
    author_name: "Omar Al Farsi",
    profile_photo_url:
      "https://ui-avatars.com/api/?name=Omar+Al+Farsi&background=1d1d1d&color=e4c98a&bold=true",
    rating: 5,
    relative_time_description: "3 weeks ago",
    text: "The yacht experience was beyond luxurious. Staff was attentive from booking to the end of the charter. A perfect weekend on the Dubai Marina.",
    author_url: "https://www.google.com/maps/contrib/",
  },
  {
    author_name: "Lisa Chen",
    profile_photo_url:
      "https://ui-avatars.com/api/?name=Lisa+Chen&background=1d1d1d&color=e4c98a&bold=true",
    rating: 4,
    relative_time_description: "2 months ago",
    text: "Great experience from start to finish. The SUV we rented for our family trip was spotless and very comfortable. Will use Ghost Rentals again.",
    author_url: "https://www.google.com/maps/contrib/",
  },
  {
    author_name: "Robert Smith",
    profile_photo_url:
      "https://ui-avatars.com/api/?name=Robert+Smith&background=1d1d1d&color=e4c98a&bold=true",
    rating: 5,
    relative_time_description: "5 weeks ago",
    text: "Flawless VIP chauffeur service for our business delegation. On time, discreet, and truly professional. The benchmark in Dubai.",
    author_url: "https://www.google.com/maps/contrib/",
  },
  {
    author_name: "Nadia Malek",
    profile_photo_url:
      "https://ui-avatars.com/api/?name=Nadia+Malek&background=1d1d1d&color=e4c98a&bold=true",
    rating: 5,
    relative_time_description: "6 days ago",
    text: "Booked a convertible for my birthday weekend — delivered straight to the hotel. The team made everything effortless. Unforgettable experience.",
    author_url: "https://www.google.com/maps/contrib/",
  },
];

export type FaqItem = {
  question: string;
  answer: string;
};

export const faqs: FaqItem[] = [
  {
    question: "How can I pay at Ghost Rentals?",
    answer:
      "We accept Visa, MasterCard, AmEx, Cash, online banking & Bitcoin — choose what works best for you at Ghost Rentals!",
  },
  {
    question: "Which luxury supercars can I rent from Ghost Rentals?",
    answer:
      "At Ghost Rentals we offer an extensive fleet of luxury & economy vehicles — all fully insured, impeccably maintained and inspected. Our 24/7 support team is always ready to help. Browse our complete catalog of luxury cars & yachts with no deposit required at the lowest market prices.",
  },
  {
    question: "How can I modify or cancel my Ghost Rentals reservation?",
    answer:
      "Yes, you can modify or cancel your reservation by contacting our customer service team. All changes must be made at least 48 hours in advance. Modifications or cancellations requested with less than 48 hours notice may incur additional fees.",
  },
  {
    question: "What are Ghost Rentals late return fees and policies?",
    answer:
      "We rent vehicles on a 24-hour basis with a 1-hour grace period for returns. After that, hourly charges apply. Beyond 3 hours late, full-day charges apply.",
  },
  {
    question:
      "Does Ghost Rentals provide roadside assistance if I encounter issues with my rental car?",
    answer:
      "If you encounter issues with your vehicle, call us immediately. For minor problems, our operations team will assist on-site. For major malfunctions we'll provide replacement or roadside assistance. Our 24/7 support ensures you're never stranded during your rental.",
  },
  {
    question: "How do I book a car and yacht rental with Ghost Rentals?",
    answer:
      "Booking is simple: visit ghostrentals.com, select your car or yacht, then call or email info@GhostRentals.com. No deposit required with the lowest prices in the market.",
  },
  {
    question: "Can I book multiple vehicles at once from Ghost Rentals?",
    answer:
      "Yes, you can book multiple vehicles at once. Simply select your desired cars and complete the booking — our team is ready to assist with any additional requirements.",
  },
];

export type PartnerItem = {
  id: string;
  name: string;
  /** Short offer label shown above the description (platform-specific perk). */
  offerTag: string;
  description: string;
  /** Asset path under `/assets/` or absolute / API URL from CMS. */
  logo?: string;
};

export const ourPartners: PartnerItem[] = [
  {
    id: "adcb",
    name: "ADCB",
    offerTag: "20% off for ADCB",
    logo: "home/partners/adcb.png",
    description:
      "ADCB cardholders enjoy an exclusive 20% discount on Luxury Car and Yacht Rentals with Ghost Rentals.",
  },
  {
    id: "oneclickdrive",
    name: "OneClickDrive.com",
    offerTag: "OneClickDrive offers",
    logo: "home/partners/oneclickdrive.png",
    description:
      "Discover exclusive Ghost Rentals offers and Premium vehicle selections through OneClickDrive.com.",
  },
  {
    id: "dubizzle",
    name: "Dubizzle",
    offerTag: "Dubizzle deals",
    logo: "home/partners/dubizzle.png",
    description:
      "Browse exclusive Ghost Rentals deals and Luxury Rental options available with Dubizzle Rentals.",
  },
  {
    id: "fazaa",
    name: "Fazaa",
    offerTag: "20% off for Fazaa",
    logo: "home/partners/fazaa.png",
    description:
      "Fazaa members receive an exclusive 20% discount on selected Luxury Car and Yacht Rentals with Ghost Rentals.",
  },
  {
    id: "esaad",
    name: "Esaad",
    offerTag: "20% off for Esaad",
    logo: "home/partners/esaad.png",
    description:
      "Esaad cardholders can enjoy an exclusive 20% discount on Luxury Vehicles from Ghost Rentals.",
  },
  {
    id: "renty",
    name: "Renty.ae",
    offerTag: "Offers on Renty.ae",
    logo: "home/partners/renty.png",
    description:
      "Explore exclusive Ghost Rentals Promotions and Luxury Rental Opportunities on Renty.ae.",
  },
  {
    id: "tabby",
    name: "Tabby",
    offerTag: "Flexible Tabby pay",
    logo: "home/partners/tabby.png",
    description:
      "Book with Ghost Rentals and enjoy flexible installment payments through Tabby for added convenience.",
  },
  {
    id: "hayak",
    name: "Hayak",
    offerTag: "Special Hayak rates",
    logo: "home/partners/hayak.png",
    description:
      "Hayak members unlock exclusive discounts and special offers on Luxury Vehicles with Ghost Rentals.",
  },
];
