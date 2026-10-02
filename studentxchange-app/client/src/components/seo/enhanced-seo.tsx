import { useEffect } from 'react';

interface EnhancedSEOProps {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  imageUrl?: string;
  type?: 'website' | 'article' | 'product';
  publishedTime?: string;
  modifiedTime?: string;
}

export function EnhancedSEO({
  title,
  description,
  keywords,
  canonicalUrl,
  imageUrl = '/og-image.png',
  type = 'website',
  publishedTime,
  modifiedTime
}: EnhancedSEOProps) {
  useEffect(() => {
    // Set document title
    document.title = title;
    
    // Meta tags for mobile optimization and SEO
    const metaTags = [
      // Basic meta tags
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },
      { name: 'author', content: 'StudentXchange' },
      { name: 'robots', content: 'index, follow, max-image-preview:large' },
      
      // Mobile optimization
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes' },
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'StudentXchange' },
      
      // Open Graph tags
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: `https://studentxchange.in${canonicalUrl}` },
      { property: 'og:image', content: `https://studentxchange.in${imageUrl}` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:site_name', content: 'StudentXchange' },
      { property: 'og:locale', content: 'en_IN' },
      
      // Twitter Card tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: `https://studentxchange.in${imageUrl}` },
      { name: 'twitter:site', content: '@StudentXchange' },
      
      // Performance and loading
      { name: 'theme-color', content: '#2563eb' },
      { name: 'msapplication-TileColor', content: '#2563eb' },
      { name: 'application-name', content: 'StudentXchange' },
      
      // Rich snippets for products
      ...(type === 'product' ? [
        { name: 'product:availability', content: 'in stock' },
        { name: 'product:condition', content: 'used' },
        { name: 'product:category', content: 'Educational Materials' }
      ] : []),
      
      // Article meta
      ...(publishedTime ? [{ property: 'article:published_time', content: publishedTime }] : []),
      ...(modifiedTime ? [{ property: 'article:modified_time', content: modifiedTime }] : [])
    ];
    
    // Remove existing meta tags and add new ones
    metaTags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      const existing = document.querySelector(selector);
      if (existing) {
        existing.setAttribute('content', content);
      } else {
        const meta = document.createElement('meta');
        if (name) meta.setAttribute('name', name);
        if (property) meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    });
    
    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `https://studentxchange.in${canonicalUrl}`;
    
    // Structured data for better SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": type === 'product' ? 'Product' : 'WebPage',
      "name": title,
      "description": description,
      "url": `https://studentxchange.in${canonicalUrl}`,
      "image": `https://studentxchange.in${imageUrl}`,
      ...(type === 'website' && {
        "mainEntity": {
          "@type": "Organization",
          "name": "StudentXchange",
          "url": "https://studentxchange.in",
          "logo": "https://studentxchange.in/logo.png",
          "description": "India's comprehensive multi-service student platform offering marketplace, collaboration tools, and freelancing opportunities",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "IN"
          }
        }
      })
    };
    
    let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement | null;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify(structuredData);
    
  }, [title, description, keywords, canonicalUrl, imageUrl, type, publishedTime, modifiedTime]);
  
  return null;
}