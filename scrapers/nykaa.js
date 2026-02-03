const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNykaa(query) {
  const searchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Cache-Control': 'max-age=0',
        'Cookie': 'lang=en' // Basic cookie to look more legitimate
      },
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status < 500; // Accept 403 to see what's blocking us
      }
    });
    
    if (response.status === 403) {
      console.log('[Nykaa] Still getting 403 - site has strong anti-bot');
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Nykaa has multiple layouts and uses dynamic class names
    // Try comprehensive selector strategy
    
    let product = null;
    let title = null;
    let price = null;
    let image = null;
    let link = null;
    let rating = null;
    
    // Strategy 1: Look for product cards
    product = $('.productCard, .product-item, [class*="css-"][class*="product"]').first();
    
    if (!product.length) {
      // Strategy 2: Look for any div with product data attributes
      product = $('[data-product-id], [data-id*="product"]').first();
    }
    
    if (!product.length) {
      // Strategy 3: Look in common container classes
      product = $('.css-13gj7qq, .css-xrzmfa, .product-listing-item').first();
    }
    
    if (product.length) {
      // Try multiple title selectors
      title = product.find('.product-title, .css-1jczs19, [class*="title"]').first().text().trim();
      if (!title) title = product.find('h2, h3, h4').first().text().trim();
      if (!title) title = product.find('a').first().attr('title');
      
      // Try multiple price selectors
      price = product.find('.product-price, .css-111z9ua, [class*="price"]').first().text().trim();
      if (!price) price = product.find('.css-4u561g, [class*="discounted"]').first().text().trim();
      
      // Rating
      rating = product.find('.rating, [class*="rating"]').first().text().trim();
      
      // Image
      image = product.find('img').first().attr('src');
      if (!image) image = product.find('img').first().attr('data-src');
      if (!image) image = product.find('img').first().attr('data-lazy-src');
      
      // Link
      link = product.find('a').first().attr('href');
      
      if (title || price) {
        const productUrl = link ? (link.startsWith('http') ? link : `https://www.nykaa.com${link}`) : searchUrl;
        
        return {
          title: title || query,
          price: price || 'Check website',
          rating: rating || '4.0',
          image: image || null,
          url: productUrl,
          searchUrl: searchUrl
        };
      }
    }
    
    // Check if we got blocked (Nykaa shows captcha/block page)
    const bodyText = $('body').text().toLowerCase();
    if (bodyText.includes('captcha') || bodyText.includes('robot') || bodyText.includes('unusual activity')) {
      console.log('[Nykaa] Detected captcha/block page');
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('[Nykaa] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeNykaa };
