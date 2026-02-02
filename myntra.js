const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMyntra(query) {
  const searchUrl = `https://www.myntra.com/${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.product-base').first();
    
    if (product.length) {
      const brand = product.find('.product-brand').text().trim();
      const name = product.find('.product-product').text().trim();
      const price = product.find('.product-discountedPrice').text().trim();
      const image = product.find('img').attr('src');
      const link = product.find('a').attr('href');
      const productUrl = link ? `https://www.myntra.com${link}` : searchUrl;
      
      return {
        title: `${brand} ${name}`.trim() || query,
        price: price || 'Check website',
        rating: '4.0',
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Myntra] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeMyntra };
