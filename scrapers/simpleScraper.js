const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSimpleSite(site, query) {
  const sites = {
    'myntra': `https://www.myntra.com/${encodeURIComponent(query)}`,
    'ajio': `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`,
    'nykaa': `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`,
    'tira': `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`
  };
  
  const url = sites[site];
  if (!url) return null;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Simple selector for each site
    const selectors = {
      'myntra': '.product-base',
      'ajio': '.item',
      'nykaa': '.product-item',
      'tira': '.product-card'
    };
    
    const product = $(selectors[site]).first();
    if (!product.length) return null;
    
    const title = product.find('[class*="title"], [class*="name"], [class*="product"]').first().text().trim();
    const price = product.find('[class*="price"]').first().text().trim();
    const img = product.find('img').first();
    const image = img.attr('src') || img.attr('data-src');
    const link = product.find('a').first();
    const productUrl = link.attr('href') ? new URL(link.attr('href'), url).href : url;
    
    return {
      title: title || query,
      price: price || 'Price not available',
      rating: null,
      image: image || null,
      url: productUrl,
      searchUrl: url
    };
    
  } catch (error) {
    console.error(`[${site}] Error:`, error.message);
    return null;
  }
}

module.exports = { scrapeSimpleSite };
