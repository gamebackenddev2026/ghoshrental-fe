import type { LegalPageCms } from '@/lib/legal/types'

export const DEFAULT_PRIVACY_CMS: LegalPageCms = {
  title: 'Privacy Policy',
  blocks: [
    { type: 'h2', text: 'Introduction' },
    {
      type: 'p',
      text: 'We, at Ghost Rentals, appreciate every customer’s trust in us in sharing their personal information. Therefore, privacy protection is very important to us. With this Privacy Policy, we explain how we will collect, use, and protect your data as you interact with our brand in renting luxury cars, yachts and chauffeurs in Dubai, UAE.',
      style: 'margin'
    },
    { type: 'h2', text: 'Information We Collect' },
    { type: 'p', text: 'Personal information', style: 'bold' },
    {
      type: 'p',
      text: 'When you book a service or send an inquiry through our website, we may collect:'
    },
    {
      type: 'ul',
      items: ['Full Name', 'Contact Information (e.g., email, phone number)', 'Payment Details']
    },
    {
      type: 'p',
      text: 'This information is essential for processing your reservations and ensuring our services meet your preferences.',
      style: 'margin'
    },
    { type: 'h2', text: 'Usage Data' },
    { type: 'p', text: 'We also gather non-personal information, such as:' },
    {
      type: 'ul',
      items: ['IP Address', 'Browser Type', 'Device Used', 'Time Spent on Our Website']
    },
    {
      type: 'p',
      text: 'This data helps us analyze user behavior and improve your experience on our platform.',
      style: 'margin'
    },
    { type: 'h2', text: 'How We Use Your Information' },
    {
      type: 'ol',
      items: [
        {
          title: 'Booking & Service Fulfillment',
          body: 'Your personal data allows us to:',
          bullets: ['Confirm bookings', 'Send updates', 'Coordinate services like vehicle delivery, yacht charters, or chauffeur logistics']
        },
        {
          title: 'Enhancing Customer Experience',
          body: 'We use your information to personalize your experience, understand your preferences, and provide tailored recommendations for future interactions.'
        },
        {
          title: 'Marketing Communication',
          body: 'With your consent, we may send you:',
          bullets: ['Updates', 'Promotional offers', 'Exclusive invitations']
        },
        {
          title: 'Legal Compliance',
          body: 'We may process or share your data to:',
          bullets: ['Comply with legal obligations', 'Respond to court orders', 'Protect our rights, users, or business interests']
        }
      ]
    },
    {
      type: 'p',
      text: 'You can unsubscribe anytime using the link provided in our messages.',
      style: 'margin'
    },
    { type: 'h2', text: 'How We Protect Your Data' },
    {
      type: 'p',
      text: 'We implement industry-standard security measures to safeguard your information, including:'
    },
    { type: 'ul', items: ['Encryption', 'Secure Servers', 'Strict Access Controls'] },
    {
      type: 'p',
      text: 'Only authorized team members, trained in confidentiality and data protection, can access your data. While we strive to ensure the highest level of security, no online transmission is 100% secure. Therefore, we cannot guarantee absolute protection.',
      style: 'margin'
    },
    { type: 'h2', text: 'Data Retention' },
    { type: 'p', text: 'We retain your personal information only as long as necessary to:' },
    { type: 'ul', items: ['Provide our services', 'Comply with legal requirements'] },
    {
      type: 'p',
      text: 'If you wish to have your data deleted, we will honor your request unless it conflicts with legal or contractual obligations.',
      style: 'margin'
    },
    { type: 'h2', text: 'Sharing Your Information' },
    {
      type: 'ol',
      items: [
        {
          title: 'Trusted Third Parties',
          body: 'To fulfill your bookings, we may share your data with trusted partners, such as:',
          bullets: ['Payment gateways', 'Service providers', 'Fleet partners']
        },
        {
          title: 'No Selling of Data',
          body: 'We do not sell, rent, or trade your personal information to third parties for marketing purposes.'
        }
      ]
    },
    {
      type: 'p',
      text: 'These third parties are contractually obligated to keep your data secure and use it solely for the intended purpose.',
      style: 'margin'
    },
    { type: 'h2', text: 'Updates to This Policy' },
    {
      type: 'p',
      text: 'We may update this Privacy Policy from time to time. Any changes will be posted on this page. We encourage you to review it regularly to stay informed about how we protect your data.'
    },
    {
      type: 'p',
      text: 'By using our services, you agree to the practices outlined in this policy.',
      style: 'margin'
    },
    { type: 'h2', text: 'Contact Us' },
    {
      type: 'p',
      text: 'If you have any questions, concerns, or requests related to your data, feel free to reach out to us:'
    },
    {
      type: 'contact',
      email: 'info@GhostRentals.com',
      websiteLabel: 'www.ghostrentals.com',
      websiteHref: '/'
    }
  ]
}

export const DEFAULT_TERMS_CMS: LegalPageCms = {
  title: 'Terms and Conditions',
  blocks: [
    {
      type: 'p',
      text: "Welcome to Ghost Rentals LLC! To ensure a smooth and enjoyable car rental experience, we've outlined our terms and conditions in a clear and easy-to-understand format. Please read them carefully before renting a vehicle."
    },
    { type: 'h2', text: 'Car Delivery and Pickup', style: 'tight' },
    {
      type: 'ul',
      items: [
        'Vehicle Condition: The car will be delivered to you in excellent condition, free of visible defects or damage, except for those noted in the provided inspection diagram.',
        'Return Policy: The vehicle must be returned to Ghost Rentals in the same condition as it was delivered.'
      ]
    },
    { type: 'h2', text: 'Terms of Use' },
    { type: 'p', text: 'As a renter, you agree to the following terms:' },
    {
      type: 'ol',
      items: [
        'Authorized Drivers Only: Only individuals listed in the rental contract are permitted to drive the vehicle.',
        'Prohibited Activities: The car must not be driven off-road, used for speed racing, rallying, or any other unauthorized activities.',
        'Vehicle Maintenance: You are responsible for conducting periodic inspections of the car and must inform Ghost Rentals of any issues. Failure to report problems and continuing to drive the car may result in liability for damages.',
        'Prohibited Goods: The car must not be used to transport illegal or prohibited items, such as alcohol or drugs.'
      ]
    },
    { type: 'h2', text: 'Insurance Exclusions' },
    { type: 'p', text: 'Insurance coverage will not apply in the following situations:' },
    {
      type: 'ul',
      items: [
        'If the driver is under the influence of alcohol or drugs at the time of an accident.',
        'If the car is rented to another party without written consent from Ghost Rentals.',
        "If the driver does not hold a valid driver's license."
      ]
    },
    {
      type: 'p',
      text: 'In these cases, the renter will be fully responsible for all damages to the vehicle and must comply with all traffic laws.'
    },
    { type: 'h2', text: 'Expenses' },
    { type: 'p', text: 'The following charges and fees apply:' },
    {
      type: 'ul',
      items: [
        'Rental Charges: Time and mileage fees are calculated based on the applicable tariff at the time of rental.',
        'Additional Fees: This includes traffic violations, Salik toll charges, vehicle delivery fees, and any other applicable expenses.',
        'Fuel Policy: The car will be delivered with a full fuel tank and must be returned in the same condition.',
        'Payment Authorization: By signing the rental agreement, you authorize Ghost Rentals to deduct all related expenses from your credit card, including charges incurred during and after the rental period.'
      ]
    },
    { type: 'h2', text: 'Accidents & Thefts' },
    {
      type: 'ul',
      items: [
        'Accidents: In the event of an accident or injury, you must immediately inform the police and have them inspect the accident site.',
        'Theft: If the vehicle or any part of it is stolen, notify the police immediately.',
        'Repairs: No repairs should be made to the vehicle without prior written consent from Ghost Rentals.'
      ]
    },
    { type: 'h2', text: 'Insurance Coverage' },
    {
      type: 'p',
      text: 'Ghost Rentals provides insurance exclusively for licensed drivers listed in the rental agreement. The insurance policy complies with UAE car accident regulations and is available upon request.'
    },
    { type: 'h2', text: 'Booking Modifications and Cancellations' },
    {
      type: 'p',
      text: 'You can modify or cancel your booking free of charge up to 48 hours before the rental start date.'
    },
    { type: 'h2', text: 'Security Deposit' },
    {
      type: 'ul',
      items: [
        'Deposit Amount: A refundable security deposit of AED 1,500 is required at the time of car pickup and must be paid via credit card.',
        'Refund Timeline: The deposit will be refunded within 21 to 30 days after the car is returned.'
      ]
    },
    { type: 'h2', text: 'Required Identification' },
    { type: 'p', text: 'To rent a car, you must provide the following documents:' },
    {
      type: 'ul',
      items: ['A copy of your passport.', "A valid driver's license.", 'An international driving license (for non-Gulf citizens).']
    },
    { type: 'h2', text: 'Payment Policy' },
    {
      type: 'ul',
      items: [
        'Accepted Payment Methods: Only credit cards are accepted. Prepaid or debit cards are not allowed.',
        'Card Ownership: The credit card used for payment must belong to the renter and must be presented at the time of vehicle pickup or delivery.'
      ],
      style: 'paymentBorder'
    },
    {
      type: 'p',
      text: 'By renting a vehicle from Ghost Rentals LLC, you agree to abide by these terms and conditions. If you have any questions or need further clarification, feel free to contact us at info@GhostRentals.com. Safe travels!',
      style: 'medium'
    }
  ]
}
