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

async function scrapeAmazon(query) {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
  
  try {
    // Optimized delay - reduced from 500-1500ms to 300-800ms
    await delay(Math.random() * 500 + 300);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1'
      },
      timeout: 7000, // Reduced from 20s to 7s (server timeout is 8s)
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.status === 403 || response.status === 429) {
      console.log('[Amazon] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    const firstProduct = $('[data-component-type="s-search-result"]').first();
    
    if (firstProduct.length) {
      // Get title
      const title = firstProduct.find('h2 a span').first().text().trim();
      
      // Extract size from title
      let size = null;
      const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                        title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i) ||
                        title.match(/([0-9]+\s?x\s?[0-9]+\s?(ml|g))/i); // e.g., "3 x 100ml"
      if (sizeMatch) {
        size = sizeMatch[1] || sizeMatch[0];
      }
      
      // Get price - Amazon format: "353." in whole, "92" in fraction
      let priceWhole = firstProduct.find('.a-price-whole').first().text().trim();
      let priceFraction = firstProduct.find('.a-price-fraction').first().text().trim();
      
      // Clean price: remove trailing dot from whole part
      priceWhole = priceWhole.replace(/\.$/, '');
      
      // Format final price
      let price = null;
      if (priceWhole) {
        if (priceFraction) {
          price = `₹${priceWhole}.${priceFraction}`;
        } else {
          price = `₹${priceWhole}`;
        }
      }
      
      // Get rating
      const rating = firstProduct.find('.a-icon-star-small span').first().text().trim();
      
      // Get image
      const image = firstProduct.find('img').first().attr('src');
      
      // Get product link
      const link = firstProduct.find('h2 a').attr('href');
      const productUrl = link ? `https://www.amazon.in${link}` : searchUrl;
      
      return {
        title: title || query,
        size: size || null,
        price: price || 'Check website',
        rating: rating || null,
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Amazon] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeAmazon };
