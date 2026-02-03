const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNykaa(query) {
  const searchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.nykaa.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple product container selectors
    let product = $('.product-item, .productCard, div[class*="product"], .css-13gj7qq').first();
    
    if (product.length) {
      // Try multiple title selectors
      let title = product.find('.product-title, .css-1jczs19, div[class*="title"], a[class*="product-title"]').first().text().trim();
      
      if (!title) {
        title = product.find('h2, h3, .css-xrzmfa').first().text().trim();
      }
      
      // Try multiple price selectors
      let price = product.find('.product-price, .css-111z9ua, span[class*="price"], .css-4u561g').first().text().trim();
      
      if (!price) {
        price = product.find('[class*="discountedPrice"], [class*="sellingPrice"]').first().text().trim();
      }
      
      // Get rating
      const rating = product.find('.rating, [class*="rating"], .css-ep3g5d').first().text().trim();
      
      // Get image
      let image = product.find('img').first().attr('src');
      if (!image) {
        image = product.find('img').first().attr('data-src');
      }
      
      // Get link
      const link = product.find('a').first().attr('href');
      let productUrl = searchUrl;
      if (link) {
        productUrl = link.startsWith('http') ? link : `https://www.nykaa.com${link}`;
      }
      
      if (title || price) {
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
    
    return null;
  } catch (error) {
    console.error('[Nykaa] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeNykaa };
