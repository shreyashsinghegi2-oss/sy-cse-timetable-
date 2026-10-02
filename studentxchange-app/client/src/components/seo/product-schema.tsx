import { Product } from '@shared/schema';

export function generateProductSchema(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product?.title || "",
    "description": product?.description || "",
    "category": product?.category || "",
    "brand": {
      "@type": "Brand",
      "name": "StudentXchange"
    },
    "image": product?.images || [],
    "offers": {
      "@type": "Offer",
      "priceCurrency": "INR",
      "price": product?.price || 0,
      "availability": (product?.quantity || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": `https://schema.org/Used${(product?.condition || "New").replace(' ', '')}`
    },
    "seller": {
      "@type": "Organization",
      "name": "StudentXchange",
      "url": "https://studentxchange.in"
    }
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "StudentXchange",
    "url": "https://studentxchange.in",
    "logo": "https://studentxchange.in/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-7039862086",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": "en"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN"
    }
  };
}

export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "StudentXchange",
    "url": "https://studentxchange.in",
    "description": "India's leading marketplace for students to buy and sell educational materials",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://studentxchange.in/browse?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "StudentXchange",
      "logo": {
        "@type": "ImageObject",
        "url": "https://studentxchange.in/logo.png"
      }
    }
  };
}