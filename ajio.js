const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAjio(query) {
  const searchUrl = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.item').first();
    
    if (product.length) {
      const brand = product.find('.brand').text().trim();
      const name = product.find('.name').text().trim();
      const price = product.find('.price').text().trim();
      const image = product.find('img').attr('src');
      const link = product.find('a').attr('href');
      const productUrl = link ? `https://www.ajio.com${link}` : searchUrl;
      
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
    console.error('[AJIO] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeAjio };
