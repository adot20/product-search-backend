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

async function scrapeFlipkart(query) {
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    // Add random delay to avoid rate limiting
    await delay(Math.random() * 1000 + 500);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.flipkart.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1'
      },
      timeout: 25000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.status === 403 || response.status === 429) {
      console.log('[Flipkart] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Extract key search terms - keep all terms, including short ones
    const queryLower = query.toLowerCase();
    const searchTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
    
    // Try multiple product container selectors
    let allProducts = $('[data-id]');
    if (allProducts.length === 0) {
      allProducts = $('div[class*="product"], div[class*="Product"]');
    }
    if (allProducts.length === 0) {
      allProducts = $('a[href*="/p/"]').parent();
    }
    
    let bestMatch = null;
    let bestScore = 0;
    let fallbackProduct = null;
    
    // Score each product based on how well it matches
    allProducts.each((i, elem) => {
      const product = $(elem);
      
      // Try multiple title selectors
      let productTitle = product.find('a[class*="wjcEIp"], a[class*="WKTcLC"], a[class*="IRlnr"]').first().text().trim();
      if (!productTitle) {
        productTitle = product.find('a[title]').attr('title') || '';
      }
      if (!productTitle) {
        productTitle = product.find('[class*="KzDlHZ"], [class*="title"], h2, h3, h4').first().text().trim();
      }
      if (!productTitle) {
        // Try finding title in any link
        product.find('a').each((idx, link) => {
          const linkText = $(link).text().trim();
          if (linkText.length > 10 && linkText.length < 200) {
            productTitle = linkText;
            return false;
          }
        });
      }
      
      if (!productTitle || productTitle.length < 5) return; // Skip if no valid title
      
      const titleLower = productTitle.toLowerCase();
      
      // Calculate match score
      let matchScore = 0;
      let exactMatches = 0;
      
      for (const term of searchTerms) {
        if (term.length < 2) continue;
        
        // Exact word match gets higher score
        const wordRegex = new RegExp(`\\b${term}\\b`, 'i');
        if (wordRegex.test(titleLower)) {
          matchScore += 3;
          exactMatches++;
        } else if (titleLower.includes(term)) {
          matchScore += 1;
        }
      }
      
      // Prefer products with more exact matches
      if (exactMatches >= 2) {
        matchScore += 10;
      }
      
      // Store first product as fallback
      if (i === 0) {
        fallbackProduct = { product, title: productTitle, score: matchScore };
      }
      
      // Track best match
      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = { product, title: productTitle, score: matchScore };
      }
    });
    
    // Use best match if score is good, otherwise use fallback
    const selected = (bestMatch && bestMatch.score >= 2) ? bestMatch : fallbackProduct;
    
    if (!selected || !selected.title) {
      return null;
    }
    
    const matchedProduct = selected.product;
    const title = selected.title;
    
    // Get price - try multiple selectors
    let price = matchedProduct.find('div[class*="Nx9bqj"], div[class*="_30jeq3"], div[class*="hl05eU"], div[class*="_1_WHN1"]').first().text().trim();
    
    if (!price) {
      // Search for price pattern in all text
      matchedProduct.find('*').each((i, elem) => {
        const text = $(elem).text().trim();
        const priceMatch = text.match(/₹[\d,]+/);
        if (priceMatch && !price && text.length < 30 && !text.includes('%') && !text.includes('off')) {
          price = priceMatch[0];
          return false;
        }
      });
    }
    
    // Clean price
    if (price) {
      const priceMatch = price.match(/₹[\d,]+/);
      if (priceMatch) {
        price = priceMatch[0];
      }
    }
    
    // Extract size from title
    let size = null;
    const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                      title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i);
    if (sizeMatch) {
      size = sizeMatch[1] || sizeMatch[0];
    }
    
    // Get image
    let image = matchedProduct.find('img').first().attr('src');
    if (!image) image = matchedProduct.find('img').first().attr('data-src');
    
    // Get link
    let link = matchedProduct.find('a[href*="/p/"]').first().attr('href');
    if (!link) link = matchedProduct.find('a').first().attr('href');
    
    // Get rating
    let rating = matchedProduct.find('div[class*="XQDdHH"], div[class*="Rsc7Yb"], span[class*="rating"]').first().text().trim();
    
    const productUrl = link ? (link.startsWith('http') ? link : `https://www.flipkart.com${link}`) : searchUrl;
    
    return {
      title: title,
      size: size || null,
      price: price || 'Check website',
      rating: rating || null,
      image: image || null,
      url: productUrl,
      searchUrl: searchUrl
    };
  } catch (error) {
    console.error('[Flipkart] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeFlipkart };
