const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTira(query) {
  const searchUrl = `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.product-card, [class*="product"]').first();
    
    if (product.length) {
      const title = product.find('[class*="title"], [class*="name"], h3, h4').first().text().trim();
      const price = product.find('[class*="price"]').first().text().trim();
      const image = product.find('img').attr('src') || product.find('img').attr('data-src');
      const link = product.find('a').attr('href');
      const productUrl = link ? `https://www.tirabeauty.com${link}` : searchUrl;
      
      return {
        title: title || query,
        price: price || 'Check website',
        rating: '4.0',
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Tira] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeTira };
