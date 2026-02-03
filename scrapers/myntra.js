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
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function scrapeMyntra(query) {
  // Myntra search URL format: https://www.myntra.com/query (direct path format)
  const searchUrl = `https://www.myntra.com/${encodeURIComponent(query)}`;
  
  try {
    // Add random delay
    await delay(Math.random() * 1000 + 500);
    
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
        'DNT': '1'
      },
      timeout: 32000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.status === 403 || response.status === 429) {
      console.log('[Myntra] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Strategy 1: Try to find product data in script tags (Myntra embeds JSON)
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content && (content.includes('searchData') || content.includes('pdpData') || content.includes('__myx'))) {
        try {
          // Try multiple JSON extraction patterns
          let match = content.match(/window\.__myx\s*=\s*({.+?});/s);
          if (!match) {
            match = content.match(/__myx\s*=\s*({.+?});/s);
          }
          if (!match) {
            match = content.match(/searchData\s*:\s*({.+?})/s);
          }
          
          if (match) {
            const jsonStr = match[1];
            // Try to extract valid JSON
            let data;
            try {
              data = JSON.parse(jsonStr);
            } catch (e) {
              // Try to find JSON object boundaries
              const jsonMatch = jsonStr.match(/\{.*"products".*\}/s);
              if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
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
              const product = products[0];
              const title = product.brand && product.product 
                ? `${product.brand} ${product.product}`.trim()
                : product.productName || product.title || product.name || null;
              
              if (title) {
                const price = product.discountedPrice || product.price || product.finalPrice || null;
                const image = product.searchImage || product.image || (product.images && product.images[0]?.src) || null;
                const link = product.landingPageUrl || product.url || product.productUrl || null;
                
                return {
                  title: title,
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
          // Continue to next script
          continue;
        }
      }
    }
    
    // Strategy 2: HTML scraping - try multiple product card selectors
    let product = $('.product-base').first();
    if (product.length === 0) {
      product = $('[class*="product-base"]').first();
    }
    if (product.length === 0) {
      product = $('li[class*="product-"]').first();
    }
    if (product.length === 0) {
      product = $('div[class*="ProductContainer"]').first();
    }
    
    if (product.length) {
      // Try multiple selectors for brand and name
      let brand = product.find('.product-brand').first().text().trim();
      if (!brand) {
        brand = product.find('h3[class*="brand"], [class*="brand-name"]').first().text().trim();
      }
      
      let name = product.find('.product-product').first().text().trim();
      if (!name) {
        name = product.find('h4[class*="product"], [class*="product-name"]').first().text().trim();
      }
      if (!name) {
        name = product.find('a[class*="product"]').first().attr('title') || '';
      }
      
      // Try multiple price selectors
      let price = product.find('.product-discountedPrice').first().text().trim();
      if (!price) {
        price = product.find('[class*="discountedPrice"]').first().text().trim();
      }
      if (!price) {
        price = product.find('.product-price').first().text().trim();
      }
      if (!price) {
        // Search for price pattern
        const priceText = product.text();
        const priceMatch = priceText.match(/₹[\d,]+/);
        if (priceMatch) {
          price = priceMatch[0];
        }
      }
      
      // Get image
      let image = product.find('img').first().attr('src');
      if (!image) image = product.find('img').first().attr('data-src');
      if (!image) image = product.find('img').first().attr('data-lazy-src');
      
      // Get link
      let link = product.find('a').first().attr('href');
      
      if (brand || name || price) {
        const title = `${brand || ''} ${name || ''}`.trim() || query;
        
        return {
          title: title,
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
