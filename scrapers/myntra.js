const axios = require('axios');
const cheerio = require('cheerio');

// Helper function to add random delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to get random user agent
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function scrapeMyntra(query) {
  // Try both URL formats
  const searchUrl1 = `https://www.myntra.com/${encodeURIComponent(query)}`;
  const searchUrl2 = `https://www.myntra.com/search?q=${encodeURIComponent(query)}`;
  
  // Try first URL format
  let result = await tryScrapeMyntra(searchUrl1, query);
  if (result) return result;
  
  // If first fails, try alternate URL format
  await delay(1000); // Extra delay between attempts
  result = await tryScrapeMyntra(searchUrl2, query);
  return result;
}

async function tryScrapeMyntra(searchUrl, query) {
  try {
    // Add random delay
    await delay(Math.random() * 1500 + 1000); // Longer delay for Myntra (1-2.5s)
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Pragma': 'no-cache'
      },
      timeout: 35000, // Extra long timeout
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.status === 403 || response.status === 429) {
      console.log('[Myntra] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Strategy 1: Try to find product data in script tags (most reliable)
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content && (content.includes('searchData') || content.includes('pdpData') || content.includes('__myx') || content.includes('products'))) {
        try {
          // Try multiple JSON extraction patterns
          let match = content.match(/window\.__myx\s*=\s*({.+?});/s);
          if (!match) match = content.match(/__myx\s*=\s*({.+?});/s);
          if (!match) match = content.match(/searchData\s*:\s*({.+?})/s);
          if (!match) match = content.match(/"searchData"\s*:\s*({.+?})/s);
          
          if (match) {
            const jsonStr = match[1];
            let data;
            try {
              data = JSON.parse(jsonStr);
            } catch (e) {
              // Try to find JSON object boundaries
              const jsonMatch = jsonStr.match(/\{.*"products".*\}/s);
              if (jsonMatch) {
                try {
                  data = JSON.parse(jsonMatch[0]);
                } catch (e2) {
                  continue;
                }
              } else {
                continue;
              }
            }
            
            // Navigate through possible data structures
            let products = null;
            if (data.searchData && data.searchData.results && data.searchData.results.products) {
              products = data.searchData.results.products;
            } else if (data.results && data.results.products) {
              products = data.results.products;
            } else if (data.products) {
              products = data.products;
            } else if (Array.isArray(data) && data.length > 0 && data[0].products) {
              products = data[0].products;
            }
            
            if (products && products.length > 0) {
              // Use Flipkart-style smart matching
              const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
              let bestMatch = null;
              let bestScore = 0;
              
              for (const product of products) {
                const title = product.brand && product.product 
                  ? `${product.brand} ${product.product}`.trim()
                  : product.productName || product.title || product.name || null;
                
                if (!title) continue;
                
                const titleLower = title.toLowerCase();
                let matchScore = 0;
                
                for (const term of searchTerms) {
                  const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
                  if (wordRegex.test(titleLower)) {
                    matchScore += 3;
                  } else if (titleLower.includes(term)) {
                    matchScore += 1;
                  }
                }
                
                if (matchScore > bestScore) {
                  bestScore = matchScore;
                  bestMatch = product;
                }
              }
              
              // Use best match if score is decent, otherwise first product
              const product = (bestMatch && bestScore >= 2) ? bestMatch : products[0];
              
              const title = product.brand && product.product 
                ? `${product.brand} ${product.product}`.trim()
                : product.productName || product.title || product.name || null;
              
              if (title) {
                const price = product.discountedPrice || product.price || product.finalPrice || null;
                const image = product.searchImage || product.image || (product.images && product.images[0]?.src) || null;
                const link = product.landingPageUrl || product.url || product.productUrl || null;
                
                // Extract size
                let size = null;
                const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                                  title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i);
                if (sizeMatch) {
                  size = sizeMatch[1] || sizeMatch[0];
                }
                
                return {
                  title: title,
                  size: size || null,
                  price: price ? `₹${price}` : 'Check website',
                  rating: product.rating ? product.rating.toString() : '4.0',
                  image: image || null,
                  url: link ? (link.startsWith('http') ? link : `https://www.myntra.com${link}`) : searchUrl,
                  searchUrl: searchUrl
                };
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Strategy 2: HTML scraping with smart matching (like Flipkart)
    let allProducts = $('.product-base, [class*="product-base"]');
    if (allProducts.length === 0) {
      allProducts = $('li[class*="product-"]');
    }
    if (allProducts.length === 0) {
      allProducts = $('div[class*="ProductContainer"]');
    }
    if (allProducts.length === 0) {
      allProducts = $('a[href*="/buy/"]').parent();
    }
    
    if (allProducts.length > 0) {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      let bestMatch = null;
      let bestScore = 0;
      let fallback = null;
      
      allProducts.each((i, elem) => {
        const product = $(elem);
        
        // Get brand and name
        let brand = product.find('.product-brand, [class*="brand"]').first().text().trim();
        let name = product.find('.product-product, [class*="product-name"]').first().text().trim();
        
        if (!name) {
          name = product.find('a[class*="product"]').first().attr('title') || '';
        }
        
        const title = `${brand} ${name}`.trim();
        if (!title || title.length < 5) return;
        
        const titleLower = title.toLowerCase();
        let matchScore = 0;
        
        for (const term of searchTerms) {
          const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
          if (wordRegex.test(titleLower)) {
            matchScore += 3;
          } else if (titleLower.includes(term)) {
            matchScore += 1;
          }
        }
        
        if (i === 0) {
          fallback = { product, title, score: matchScore };
        }
        
        if (matchScore > bestScore) {
          bestScore = matchScore;
          bestMatch = { product, title, score: matchScore };
        }
      });
      
      const selected = (bestMatch && bestMatch.score >= 2) ? bestMatch : fallback;
      
      if (selected && selected.title) {
        const product = selected.product;
        const title = selected.title;
        
        // Get price
        let price = product.find('.product-discountedPrice, [class*="discountedPrice"]').first().text().trim();
        if (!price) {
          price = product.find('.product-price').first().text().trim();
        }
        if (!price) {
          const priceText = product.text();
          const priceMatch = priceText.match(/₹[\d,]+/);
          if (priceMatch) price = priceMatch[0];
        }
        
        // Extract size
        let size = null;
        const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                          title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i);
        if (sizeMatch) {
          size = sizeMatch[1] || sizeMatch[0];
        }
        
        // Get image
        let image = product.find('img').first().attr('src');
        if (!image) image = product.find('img').first().attr('data-src');
        if (!image) image = product.find('img').first().attr('data-lazy-src');
        
        // Get link
        let link = product.find('a').first().attr('href');
        
        return {
          title: title,
          size: size || null,
          price: price || 'Check website',
          rating: '4.0',
          image: image || null,
          url: link ? (link.startsWith('http') ? link : `https://www.myntra.com${link}`) : searchUrl,
          searchUrl: searchUrl
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Myntra] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeMyntra };
