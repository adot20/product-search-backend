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
    
    // Strategy 1: Find product with data-id
    product = $('[data-id]').first();
    
    if (product.length) {
      // Get title (multiple strategies)
      title = product.find('a.wjcEIp').text().trim() ||
              product.find('a.WKTcLC').text().trim() ||
              product.find('a.IRlnr').text().trim() ||
              product.find('a.s1Q9rs').text().trim() ||
              product.find('div.KzDlHZ').text().trim() ||
              product.find('a[title]').attr('title');
      
      // AGGRESSIVE PRICE SEARCH - Look for ANY div containing ₹
      // First try known classes
      price = product.find('div.Nx9bqj').text().trim() ||
              product.find('div._30jeq3').text().trim() ||
              product.find('div.hl05eU').text().trim() ||
              product.find('div._1_WHN1').text().trim();
      
      // If still no price, search for any element with ₹ symbol
      if (!price) {
        product.find('div, span').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text.includes('₹') && text.length < 20) { // Price should be short
            price = text;
            return false; // break loop
          }
        });
      }
      
      // Extract size from title if present
      const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L))\)/i) ||
                        title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L))/i);
      if (sizeMatch) {
        size = sizeMatch[1] || sizeMatch[0];
      }
      
      // Get image
      image = product.find('img').first().attr('src');
      
      // Get link
      link = product.find('a').first().attr('href');
      
      // Get rating
      rating = product.find('div.XQDdHH').text().trim() ||
               product.find('div.Rsc7Yb').text().trim() ||
               product.find('span[class*="rating"]').text().trim();
    }
    
    // Strategy 2: Try old layout
    if (!title || !price) {
      product = $('.tUxRFH, ._1AtVbE, ._13oc-S, .CGtC98, ._2kHMtA').first();
      
      if (product.length) {
        if (!title) {
          title = product.find('._4rR01T, .IRlnr, .s1Q9rs, .wjcEIp').text().trim() ||
                  product.find('a').attr('title') ||
                  product.find('a').text().trim();
        }
        
        if (!price) {
          price = product.find('._30jeq3, ._1_WHN1, .Nx9bqj, .hl05eU').text().trim();
          
          // Aggressive search in this container too
          if (!price) {
            product.find('div, span').each((i, elem) => {
              const text = $(elem).text().trim();
              if (text.includes('₹') && text.length < 20) {
                price = text;
                return false;
              }
            });
          }
        }
        
        if (!size) {
          const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L))\)/i) ||
                            title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L))/i);
          if (sizeMatch) {
            size = sizeMatch[1] || sizeMatch[0];
          }
        }
        
        if (!image) image = product.find('img').attr('src');
        if (!link) link = product.find('a').attr('href');
        if (!rating) rating = product.find('.XQDdHH, ._3LWZlK, .Rsc7Yb').text().trim();
      }
    }
    
    // If we found something
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
