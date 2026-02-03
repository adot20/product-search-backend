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

async function scrapeAmazon(query) {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
  
  try {
    // Add random delay
    await delay(Math.random() * 1000 + 500);
    
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
        'DNT': '1'
      },
      timeout: 20000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.status === 403 || response.status === 429) {
      console.log('[Amazon] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    const queryNorm = query.trim().toLowerCase();
    
    // Helper: treat title as invalid if it's just the search query (Amazon sometimes echoes it)
    function isInvalidTitle(t) {
      if (!t || t.length < 10) return true;
      const tNorm = t.trim().toLowerCase();
      if (tNorm === queryNorm) return true;
      // Same words in same order (query is substring of title is ok)
      const queryWords = queryNorm.split(/\s+/).filter(Boolean);
      if (queryWords.length >= 2 && tNorm === queryWords.join(' ')) return true;
      return false;
    }
    
    // Try multiple selectors for product container
    let productList = $('[data-component-type="s-search-result"]');
    if (productList.length === 0) {
      productList = $('div[data-cel-widget*="search_result"]');
    }
    if (productList.length === 0) {
      productList = $('div[class*="s-result-item"]');
    }
    
    let firstProduct = null;
    let title = null;
    
    for (let i = 0; i < Math.min(productList.length, 10); i++) {
      const product = productList.eq(i);
      // Prefer full h2 text (actual product title is usually the longest / full line)
      let t = product.find('h2').text().trim();
      if (!t) {
        t = product.find('h2 a span.a-text-normal').first().text().trim();
      }
      if (!t) {
        t = product.find('h2 a span').first().text().trim();
      }
      if (!t) {
        t = product.find('[data-cy="title-recipe"]').first().text().trim();
      }
      if (isInvalidTitle(t)) continue;
      title = t;
      firstProduct = product;
      break;
    }
    
    if (firstProduct && firstProduct.length && title) {
      
      // Extract size from title
      let size = null;
      const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                        title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i) ||
                        title.match(/([0-9]+\s?x\s?[0-9]+\s?(ml|g))/i);
      if (sizeMatch) {
        size = sizeMatch[1] || sizeMatch[0];
      }
      
      // Get price - try multiple selectors
      let priceWhole = firstProduct.find('.a-price-whole').first().text().trim();
      let priceFraction = firstProduct.find('.a-price-fraction').first().text().trim();
      
      // If no price found, try alternative selectors
      if (!priceWhole) {
        const priceText = firstProduct.find('.a-price, [class*="price"]').first().text().trim();
        const priceMatch = priceText.match(/₹[\d,]+\.?(\d{2})?/);
        if (priceMatch) {
          const fullPrice = priceMatch[0].replace('₹', '').replace(/,/g, '');
          const parts = fullPrice.split('.');
          priceWhole = parts[0];
          priceFraction = parts[1] || '';
        }
      }
      
      // Clean price: remove trailing dot from whole part
      if (priceWhole) {
        priceWhole = priceWhole.replace(/\.$/, '').replace(/,/g, '');
      }
      
      // Format final price
      let price = null;
      if (priceWhole) {
        if (priceFraction) {
          price = `₹${priceWhole}.${priceFraction}`;
        } else {
          price = `₹${priceWhole}`;
        }
      }
      
      // Get rating - try multiple selectors
      let rating = firstProduct.find('.a-icon-star-small span, .a-icon-alt').first().text().trim();
      if (!rating) {
        rating = firstProduct.find('[aria-label*="star"]').first().attr('aria-label') || '';
        const ratingMatch = rating.match(/([\d.]+)\s+out/);
        if (ratingMatch) {
          rating = ratingMatch[1];
        }
      }
      
      // Get image
      let image = firstProduct.find('img.s-image').first().attr('src');
      if (!image) {
        image = firstProduct.find('img').first().attr('src');
      }
      
      // Get product link
      let link = firstProduct.find('h2 a').first().attr('href');
      if (!link) {
        link = firstProduct.find('a[href*="/dp/"]').first().attr('href');
      }
      
      const productUrl = link ? (link.startsWith('http') ? link : `https://www.amazon.in${link}`) : searchUrl;
      
      return {
        title: title,
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
