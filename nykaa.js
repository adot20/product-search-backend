const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeNykaa(query) {
  const searchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.product-item, .productCard').first();
    
    if (product.length) {
      const title = product.find('[class*="title"], [class*="name"]').first().text().trim();
      const price = product.find('[class*="price"]').first().text().trim();
      const rating = product.find('[class*="rating"]').first().text().trim();
      const image = product.find('img').attr('src') || product.find('img').attr('data-src');
      const link = product.find('a').attr('href');
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
    
    return null;
  } catch (error) {
    console.error('[Nykaa] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeNykaa };
