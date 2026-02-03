const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMyntra(query) {
  const searchUrl = `https://www.myntra.com/${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Myntra has multiple layouts
    let product = $('.product-base, .product-productMetaInfo, li[class*="product-"]').first();
    
    if (product.length) {
      // Try multiple title selectors
      const brand = product.find('.product-brand, h3[class*="product-brand"], .brand-name').first().text().trim();
      const name = product.find('.product-product, h4[class*="product-product"], .product-name').first().text().trim();
      const title = `${brand} ${name}`.trim();
      
      // Try multiple price selectors
      let price = product.find('.product-discountedPrice, .product-price, span[class*="product-discountedPrice"]').first().text().trim();
      
      // If no discounted price, try regular price
      if (!price) {
        price = product.find('.product-strike, span[class*="product-strike"]').first().text().trim();
      }
      
      // Get image
      const image = product.find('img').first().attr('src') || product.find('img').first().attr('data-src');
      
      // Get link
      const link = product.find('a').first().attr('href');
      const productUrl = link ? (link.startsWith('http') ? link : `https://www.myntra.com${link}`) : searchUrl;
      
      if (title || price) {
        return {
          title: title || query,
          price: price || 'Check website',
          rating: '4.0',
          image: image || null,
          url: productUrl,
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
