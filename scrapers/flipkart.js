const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFlipkart(query) {
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple selector strategies (Flipkart changes classes frequently)
    let product = null;
    let title = null;
    let price = null;
    let image = null;
    let link = null;
    let rating = null;
    
    // Strategy 1: Look for [data-id] products
    product = $('[data-id]').first();
    if (product.length) {
      title = product.find('a[title]').first().attr('title') || 
              product.find('div[class*="IRlnr"]').first().text().trim() ||
              product.find('div[class*="KzDlH"]').first().text().trim();
      
      price = product.find('div[class*="_30jeq3"]').first().text().trim() ||
              product.find('div[class*="_1_WHN1"]').first().text().trim() ||
              product.find('div[class*="Nx9bqj"]').first().text().trim();
      
      image = product.find('img').first().attr('src');
      link = product.find('a').first().attr('href');
      
      rating = product.find('div[class*="XQDdHH"]').first().text().trim() ||
               product.find('div[class*="_3LWZlK"]').first().text().trim();
    }
    
    // Strategy 2: If strategy 1 failed, try product grid
    if (!title) {
      product = $('._1AtVbE, ._13oc-S, .CGtC98').first();
      if (product.length) {
        title = product.find('._4rR01T, .IRlnr, .s1Q9rs').first().text().trim() ||
                product.find('a').first().attr('title');
        
        price = product.find('._30jeq3, ._1_WHN1, .Nx9bqj').first().text().trim();
        
        image = product.find('img').first().attr('src');
        link = product.find('a').first().attr('href');
        rating = product.find('.XQDdHH, ._3LWZlK').first().text().trim();
      }
    }
    
    // If we found something
    if (title || price) {
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
