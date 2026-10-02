export const SEO_CONFIG = {
  siteName: 'StudentXchange',
  siteUrl: 'https://studentxchange.in',
  defaultImage: '/og-image.png',
  twitterHandle: '@studentxchange',
  themeColor: '#2563eb',
  
  pages: {
    home: {
      title: "StudentXchange - India's Multi-Service Student Platform | Marketplace, Collaboration & Freelancing",
      description: "India's comprehensive multi-service student platform. Buy & sell educational materials, collaborate on projects, find student freelancing gigs, and build your academic network.",
      keywords: "student platform India, student marketplace India, buy sell student materials, student freelancing platform, student collaboration platform, college student marketplace"
    },
    
    browse: {
      title: "Student Marketplace - Buy & Sell Books, Notes, Study Materials | StudentXchange",
      description: "Buy and sell educational materials on India's trusted student marketplace. Textbooks, study notes, calculators, lab equipment at student-friendly prices with secure UPI payments.",
      keywords: "buy sell books online, student marketplace India, secondhand textbooks, study notes, calculators, lab equipment, college materials"
    },
    
    studentCollab: {
      title: "Student Collaboration - Connect, Network & Build Projects | StudentXchange",
      description: "Connect with peers, form project teams, and network with students across Indian universities. Find collaboration partners and build your academic network.",
      keywords: "student collaboration platform, student networking India, college project teams, peer connections, academic collaboration, student community"
    },
    
    studentLancing: {
      title: "Student Freelancing - Gigs, Jobs & Internships for Students | StudentXchange",
      description: "Find jobs and internships suited for students. Earn while you learn with flexible opportunities from verified companies.",
      keywords: "student freelancing India, college internships, student jobs, freelance for students"
    },
    
    collabArena: {
      title: "Collab Arena - Student Talent Showcase & Competitions | StudentXchange",
      description: "Showcase your talent in Creative House, Idea Innovation, and House of Tech competitions. Win prizes up to Rs.10,000 and get certified by StudentXchange.",
      keywords: "student competitions India, talent showcase, creative contests, innovation challenges, tech competitions, student awards"
    },
    
    sell: {
      title: "Sell Your Study Materials - List Books, Notes & Equipment | StudentXchange",
      description: "Sell your old textbooks, study notes, calculators, and lab equipment to students who need them. Quick listing, secure payments via UPI.",
      keywords: "sell books online India, sell study notes, sell textbooks, sell calculators, student seller, secondhand materials"
    },
    
    auth: {
      title: "Sign In or Register - StudentXchange",
      description: "Join India's leading multi-service student platform. Create your free account to buy, sell, collaborate, and find freelancing opportunities.",
      keywords: "student login, register student platform, join studentxchange, student account"
    },
    
    orders: {
      title: "My Orders - Track Your Purchases | StudentXchange",
      description: "Track your orders and manage purchases on StudentXchange. View order history, delivery status, and transaction details.",
      keywords: "student orders, order tracking, purchase history, delivery status"
    },
    
    profile: {
      title: "My Profile - Manage Your StudentXchange Account",
      description: "Manage your StudentXchange profile, trust score, and account settings. Build your reputation in India's student community.",
      keywords: "student profile, trust score, account settings, seller profile"
    },
    
    terms: {
      title: "Terms of Service - StudentXchange",
      description: "Read the terms and conditions for using StudentXchange, India's multi-service student platform.",
      keywords: "terms of service, user agreement, platform rules"
    },
    
    privacy: {
      title: "Privacy Policy - StudentXchange",
      description: "Learn how StudentXchange protects your data and privacy. Our commitment to keeping your information safe.",
      keywords: "privacy policy, data protection, student privacy"
    },
    
    contact: {
      title: "Contact Us - StudentXchange Support",
      description: "Get in touch with StudentXchange support team. We're here to help with any questions about our student platform.",
      keywords: "contact studentxchange, support, help, customer service"
    }
  },
  
  categories: {
    textbooks: {
      title: "Textbooks - Buy & Sell College Textbooks | StudentXchange",
      description: "Buy and sell college textbooks at student-friendly prices. Engineering, medical, commerce, arts textbooks available from verified student sellers.",
      keywords: "buy textbooks online, sell textbooks, college textbooks India, secondhand books"
    },
    notes: {
      title: "Study Notes - Buy & Sell Notes | StudentXchange", 
      description: "Quality study notes from top students. Handwritten and digital notes for exams, assignments, and coursework.",
      keywords: "buy study notes, sell notes, exam notes, handwritten notes, digital notes"
    },
    calculators: {
      title: "Calculators - Scientific & Graphing Calculators | StudentXchange",
      description: "Buy and sell scientific and graphing calculators. Casio, Texas Instruments and more at discounted student prices.",
      keywords: "buy scientific calculator, sell calculator, graphing calculator, Casio calculator"
    },
    labEquipment: {
      title: "Lab Equipment - Buy & Sell Laboratory Items | StudentXchange",
      description: "Laboratory equipment for engineering and science students. Lab coats, instruments, kits at affordable prices.",
      keywords: "buy lab equipment, sell lab items, laboratory instruments, lab coat, science kit"
    }
  }
};

export function getPageSEO(pageName: keyof typeof SEO_CONFIG.pages) {
  return SEO_CONFIG.pages[pageName];
}

export function getCategorySEO(category: keyof typeof SEO_CONFIG.categories) {
  return SEO_CONFIG.categories[category];
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  price: string;
  image: string;
  condition: string;
  category: string;
  seller: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "url": product.url,
    "category": product.category,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": product.price,
      "availability": "https://schema.org/InStock",
      "itemCondition": product.condition === 'new' 
        ? "https://schema.org/NewCondition" 
        : "https://schema.org/UsedCondition",
      "seller": {
        "@type": "Person",
        "name": product.seller
      }
    }
  };
}
