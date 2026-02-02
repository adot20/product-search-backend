const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFlipkart(query) {
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const firstProduct = $('[data-id]').first();
    
    if (firstProduct.length) {
      const title = firstProduct.find('a[title]').first().attr('title') || 
                    firstProduct.find('[class*="title"]').first().text().trim();
      const price = firstProduct.find('[class*="price"]').first().text().trim();
      const rating = firstProduct.find('[class*="rating"]').first().text().trim();
      const image = firstProduct.find('img').first().attr('src');
      const link = firstProduct.find('a').first().attr('href');
      const productUrl = link ? `https://www.flipkart.com${link}` : searchUrl;
      
      return {
        title: title || query,
        price: price || 'Check website',
        rating: rating || null,
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Flipkart] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeFlipkart };
