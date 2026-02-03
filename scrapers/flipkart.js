const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeFlipkart(query) {
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.flipkart.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 25000, // Increased to 25 seconds
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Flipkart has multiple possible layouts - try all of them
    let product = null;
    let title = null;
    let price = null;
    let image = null;
    let link = null;
    let rating = null;
    
    // Strategy 1: New layout with data-id
    product = $('[data-id]').first();
    if (product.length) {
      // Multiple possible title selectors
      title = product.find('a.IRlnr').text().trim() ||
              product.find('a.s1Q9rs').text().trim() ||
              product.find('div.IRlnr').text().trim() ||
              product.find('a[title]').attr('title') ||
              product.find('.KzDlH').text().trim();
      
      // Multiple possible price selectors  
      price = product.find('div._30jeq3').text().trim() ||
              product.find('div._1_WHN1').text().trim() ||
              product.find('div.Nx9bqj').text().trim() ||
              product.find('._30jeq3._16Jk6d').text().trim();
      
      image = product.find('img').first().attr('src');
      link = product.find('a').first().attr('href');
      rating = product.find('div.XQDdHH').text().trim();
    }
    
    // Strategy 2: Old grid layout
    if (!title) {
      product = $('._1AtVbE, ._13oc-S, .CGtC98, ._2kHMtA').first();
      if (product.length) {
        title = product.find('._4rR01T, .IRlnr, .s1Q9rs').text().trim() ||
                product.find('a').attr('title');
        price = product.find('._30jeq3, ._1_WHN1, .Nx9bqj').text().trim();
        image = product.find('img').attr('src');
        link = product.find('a').attr('href');
        rating = product.find('.XQDdHH, ._3LWZlK').text().trim();
      }
    }
    
    // Strategy 3: Search result cards
    if (!title) {
      product = $('._2kHMtA, ._1AtVbE').first();
      if (product.length) {
        title = product.find('a').text().trim() || product.find('a').attr('title');
        price = product.find('[class*="price"]').first().text().trim();
        image = product.find('img').attr('src');
        link = product.find('a').attr('href');
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
