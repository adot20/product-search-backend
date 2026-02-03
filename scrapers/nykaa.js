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

async function scrapeNykaa(query) {
  const searchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;
  
  try {
    // Add random delay
    await delay(Math.random() * 1000 + 500);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.nykaa.com/',
        'Origin': 'https://www.nykaa.com',
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
      console.log('[Nykaa] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Check if we got blocked
    const bodyText = $('body').text().toLowerCase();
    if (bodyText.includes('captcha') || bodyText.includes('robot') || bodyText.includes('unusual activity') || bodyText.includes('access denied')) {
      console.log('[Nykaa] Detected captcha/block page');
      return null;
    }
    
    // Strategy 1: Try to find product data in script tags (Nykaa uses React/JSON)
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content && (content.includes('products') || content.includes('productList') || content.includes('__NEXT_DATA__') || content.includes('searchResults'))) {
        try {
          // Try to extract JSON data
          let match = content.match(/__NEXT_DATA__\s*=\s*({.+?});/s);
          if (!match) {
            match = content.match(/searchResults\s*:\s*(\[.+?\])/s);
          }
          if (!match) {
            match = content.match(/products\s*:\s*(\[.+?\])/s);
          }
          
          if (match) {
            const jsonStr = match[1];
            try {
              const data = JSON.parse(jsonStr);
              
              // Navigate through possible data structures
              let products = null;
              if (data.props && data.props.pageProps && data.props.pageProps.products) {
                products = data.props.pageProps.products;
              } else if (data.products) {
                products = data.products;
              } else if (data.searchResults) {
                products = data.searchResults;
              } else if (Array.isArray(data)) {
                products = data;
              }
              
              if (products && products.length > 0) {
                const product = products[0];
                const title = product.productName || product.name || product.title || 
                             (product.brandName && product.productName ? `${product.brandName} ${product.productName}` : null);
                
                if (title) {
                  const price = product.mrp || product.price || product.finalPrice || product.sellingPrice || null;
                  const image = product.productImage || product.imageUrl || product.image || 
                               (product.images && product.images[0] ? product.images[0].url : null);
                  const link = product.productUrl || product.url || product.link || product.slug || null;
                  const rating = product.rating || product.averageRating || null;
                  
                  // Extract size from title
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
                    rating: rating ? rating.toString() : '4.0',
                    image: image || null,
                    url: link ? (link.startsWith('http') ? link : `https://www.nykaa.com${link}`) : searchUrl,
                    searchUrl: searchUrl
                  };
                }
              }
            } catch (e) {
              continue;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Strategy 2: HTML scraping - try multiple product card selectors
    let product = $('.productCard').first();
    if (product.length === 0) {
      product = $('[class*="product-card"]').first();
    }
    if (product.length === 0) {
      product = $('[class*="css-"][class*="product"]').first();
    }
    if (product.length === 0) {
      product = $('[data-product-id]').first();
    }
    if (product.length === 0) {
      product = $('.css-13gj7qq, .css-xrzmfa, .product-listing-item').first();
    }
    if (product.length === 0) {
      product = $('a[href*="/product/"]').parent().first();
    }
    
    if (product.length) {
      // Try multiple title selectors
      let title = product.find('.product-title, [class*="product-title"]').first().text().trim();
      if (!title) {
        title = product.find('.css-1jczs19, [class*="title"]').first().text().trim();
      }
      if (!title) {
        title = product.find('h2, h3, h4').first().text().trim();
      }
      if (!title) {
        title = product.find('a').first().attr('title') || '';
      }
      if (!title) {
        title = product.find('a').first().text().trim();
      }
      
      // Extract size from title
      let size = null;
      if (title) {
        const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                          title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i) ||
                          title.match(/([0-9]+\s?x\s?[0-9]+\s?(ml|g))/i);
        if (sizeMatch) {
          size = sizeMatch[1] || sizeMatch[0];
        }
      }
      
      // Try multiple price selectors
      let price = product.find('.product-price, [class*="product-price"]').first().text().trim();
      if (!price) {
        price = product.find('.css-111z9ua, span[class*="price"], .css-4u561g').first().text().trim();
      }
      if (!price) {
        price = product.find('[class*="discountedPrice"], [class*="sellingPrice"]').first().text().trim();
      }
      if (!price) {
        // Search for price pattern
        const priceText = product.text();
        const priceMatch = priceText.match(/₹[\d,]+/);
        if (priceMatch) {
          price = priceMatch[0];
        }
      }
      
      // Rating
      let rating = product.find('.rating, [class*="rating"]').first().text().trim();
      if (!rating) {
        rating = product.find('.css-ep3g5d').first().text().trim();
      }
      
      // Image
      let image = product.find('img').first().attr('src');
      if (!image) image = product.find('img').first().attr('data-src');
      if (!image) image = product.find('img').first().attr('data-lazy-src');
      
      // Link
      let link = product.find('a').first().attr('href');
      
      if (title || price) {
        const productUrl = link ? (link.startsWith('http') ? link : `https://www.nykaa.com${link}`) : searchUrl;
        
        return {
          title: title || query,
          size: size || null,
          price: price || 'Check website',
          rating: rating || '4.0',
          image: image || null,
          url: productUrl,
          searchUrl: searchUrl
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Nykaa] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeNykaa };
