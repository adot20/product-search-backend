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
      timeout: 25000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    let product = null;
    let title = null;
    let price = null;
    let size = null;
    let image = null;
    let link = null;
    let rating = null;
    
    // Find product with data-id
    product = $('[data-id]').first();
    
    if (product.length) {
      // Get title
      title = product.find('a.wjcEIp').text().trim() ||
              product.find('a.WKTcLC').text().trim() ||
              product.find('a.IRlnr').text().trim() ||
              product.find('a.s1Q9rs').text().trim() ||
              product.find('div.KzDlHZ').text().trim() ||
              product.find('a[title]').attr('title');
      
      // CRITICAL FIX: Get price - take ONLY FIRST match
      // Try known price classes first
      const priceElement = product.find('div.Nx9bqj, div._30jeq3, div.hl05eU, div._1_WHN1').first();
      
      if (priceElement.length) {
        price = priceElement.text().trim();
      }
      
      // If still no price, search for first element with ₹
      if (!price) {
        product.find('div, span').each((i, elem) => {
          const text = $(elem).text().trim();
          // Must have ₹, be short (< 15 chars), and not already found
          if (!price && text.includes('₹') && text.length < 15 && !text.includes('%')) {
            price = text;
            return false; // Stop at FIRST match
          }
        });
      }
      
      // Clean price - remove any trailing text after second ₹ symbol
      if (price && price.split('₹').length > 2) {
        // Has multiple prices, take first one
        const firstPrice = price.match(/₹[0-9,]+/);
        if (firstPrice) {
          price = firstPrice[0];
        }
      }
      
      // Extract size from title
      if (title) {
        const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                          title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i);
        if (sizeMatch) {
          size = sizeMatch[1] || sizeMatch[0];
        }
      }
      
      image = product.find('img').first().attr('src');
      link = product.find('a').first().attr('href');
      rating = product.find('div.XQDdHH, div.Rsc7Yb, span[class*="rating"]').first().text().trim();
    }
    
    // Try old layout if nothing found
    if (!title || !price) {
      product = $('.tUxRFH, ._1AtVbE, ._13oc-S').first();
      
      if (product.length) {
        if (!title) {
          title = product.find('._4rR01T, .IRlnr, .s1Q9rs, .wjcEIp').text().trim() ||
                  product.find('a').attr('title');
        }
        
        if (!price) {
          const priceElem = product.find('._30jeq3, ._1_WHN1, .Nx9bqj').first();
          if (priceElem.length) {
            price = priceElem.text().trim();
          }
        }
        
        if (!size && title) {
          const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz))\)/i) ||
                            title.match(/([0-9]+\s?(ml|g|kg|l|oz))/i);
          if (sizeMatch) {
            size = sizeMatch[1] || sizeMatch[0];
          }
        }
        
        if (!image) image = product.find('img').attr('src');
        if (!link) link = product.find('a').attr('href');
        if (!rating) rating = product.find('.XQDdHH, ._3LWZlK').text().trim();
      }
    }
    
    if (title) {
      const productUrl = link ? `https://www.flipkart.com${link}` : searchUrl;
      
      return {
        title: title || query,
        size: size || null,
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
