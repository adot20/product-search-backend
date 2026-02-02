const axios = require('axios');
const cheerio = require('cheerio');

async function searchGoogleShopping(query, site) {
  console.log(`[GoogleShopping] Searching ${site} for: ${query}`);
  
  // Map sites to Google Shopping identifiers
  const siteFilters = {
    'amazon': 'Amazon.in',
    'flipkart': 'Flipkart',
    'myntra': 'Myntra',
    'ajio': 'AJIO',
    'nykaa': 'Nykaa',
    'tira': 'Tira'
  };
  
  const storeFilter = siteFilters[site] || '';
  const searchQuery = encodeURIComponent(`${query} ${storeFilter}`);
  const searchUrl = `https://www.google.com/search?tbm=shop&q=${searchQuery}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const firstProduct = $('[data-product-id]').first();
    
    if (!firstProduct.length) {
      return null;
    }
    
    const title = firstProduct.find('[role="link"] span').first().text().trim();
    const price = firstProduct.find('.a8Pemb').text().trim();
    const seller = firstProduct.find('.aULzUe').text().trim();
    const link = firstProduct.find('a').attr('href');
    
    // Extract actual product URL from Google redirect
    let productUrl = '';
    if (link && link.includes('url=')) {
      const match = link.match(/url=([^&]+)/);
      if (match) productUrl = decodeURIComponent(match[1]);
    }
    
    return {
      title: title || query,
      price: price || 'Price not available',
      rating: null, // Google Shopping doesn't always show ratings
      image: null,
      url: productUrl || `https://www.google.com/search?tbm=shop&q=${searchQuery}`,
      source: 'Google Shopping'
    };
    
  } catch (error) {
    console.error(`[GoogleShopping] Error for ${site}:`, error.message);
    return null;
  }
}

module.exports = { searchGoogleShopping };