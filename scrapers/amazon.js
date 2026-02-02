const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAmazon(query) {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const firstProduct = $('[data-component-type="s-search-result"]').first();
    
    if (firstProduct.length) {
      const title = firstProduct.find('h2 a span').text().trim();
      const priceWhole = firstProduct.find('.a-price-whole').first().text().trim();
      const priceFraction = firstProduct.find('.a-price-fraction').first().text().trim();
      const price = priceWhole ? `₹${priceWhole}${priceFraction}` : null;
      const rating = firstProduct.find('.a-icon-star-small span').first().text().trim();
      const image = firstProduct.find('img').first().attr('src');
      const link = firstProduct.find('h2 a').attr('href');
      const productUrl = link ? `https://www.amazon.in${link}` : searchUrl;
      
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
    console.error('[Amazon] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeAmazon };
