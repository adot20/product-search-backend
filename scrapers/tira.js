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

async function scrapeTira(query) {
  const searchUrl = `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`;
  
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
        'DNT': '1'
      },
      timeout: 20000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (response.status === 403 || response.status === 429) {
      console.log('[Tira] Blocked or rate limited');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Try to find product data in script tags (Tira uses React/JSON)
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content && (content.includes('products') || content.includes('productList') || content.includes('__NEXT_DATA__') || content.includes('__INITIAL_STATE__'))) {
        try {
          // Try to extract JSON data
          let match = content.match(/__NEXT_DATA__\s*=\s*({.+?});/s);
          if (!match) {
            match = content.match(/__INITIAL_STATE__\s*=\s*({.+?});/s);
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
              } else if (data.search && data.search.products) {
                products = data.search.products;
              } else if (Array.isArray(data)) {
                products = data;
              }
              
              if (products && products.length > 0) {
                const product = products[0];
                const title = product.name || product.productName || product.title || 
                             (product.brand && product.name ? `${product.brand} ${product.name}` : null);
                
                if (title) {
                  const price = product.price || product.finalPrice || product.sellingPrice || product.discountedPrice || null;
                  const image = product.images && product.images[0] ? product.images[0].url : 
                               (product.imageUrl || product.image || product.thumbnail || null);
                  const link = product.url || product.productUrl || product.link || product.slug || null;
                  
                  return {
                    title: title,
                    price: price ? `₹${price}` : 'Check website',
                    rating: product.rating ? product.rating.toString() : '4.0',
                    image: image || null,
                    url: link ? (link.startsWith('http') ? link : `https://www.tirabeauty.com${link}`) : searchUrl,
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
    
    // Fallback: HTML scraping - try multiple product card selectors
    let product = $('[class*="product"]').first();
    if (product.length === 0) {
      product = $('[data-product-id]').first();
    }
    if (product.length === 0) {
      product = $('div[class*="ProductCard"], div[class*="product-card"]').first();
    }
    if (product.length === 0) {
      product = $('a[href*="/product/"]').parent().first();
    }
    
    if (product.length) {
      // Try multiple selectors for title
      let title = product.find('[class*="product-name"], [class*="product-title"]').first().text().trim();
      if (!title) {
        title = product.find('h2, h3, h4').first().text().trim();
      }
      if (!title) {
        title = product.find('a[title]').first().attr('title') || '';
      }
      if (!title) {
        title = product.find('a').first().text().trim();
      }
      
      // Try multiple price selectors
      let price = product.find('[class*="price"]').first().text().trim();
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
      
      if (title || price) {
        return {
          title: title || query,
          price: price || 'Check website',
          rating: '4.0',
          image: image || null,
          url: link ? (link.startsWith('http') ? link : `https://www.tirabeauty.com${link}`) : searchUrl,
          searchUrl: searchUrl
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Tira] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeTira };
