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
    
    // STRATEGY: Find product that matches query, not just first one
    const allProducts = $('[data-id]');
    
    let matchedProduct = null;
    let title = null;
    let price = null;
    let size = null;
    let image = null;
    let link = null;
    let rating = null;
    
    // Extract key search terms from query
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    
    // Try to find product that matches search terms
    allProducts.each((i, elem) => {
      const product = $(elem);
      
      // Get title from this product
      const productTitle = product.find('a.wjcEIp').text().trim() ||
                          product.find('a.WKTcLC').text().trim() ||
                          product.find('a.IRlnr').text().trim() ||
                          product.find('a[title]').attr('title') ||
                          product.find('.KzDlHZ').text().trim();
      
      if (!productTitle) return; // Skip if no title
      
      const titleLower = productTitle.toLowerCase();
      
      // Check if title contains at least 2 search terms
      let matchCount = 0;
      for (const term of searchTerms) {
        if (titleLower.includes(term)) {
          matchCount++;
        }
      }
      
      // If good match found (at least 2 terms), use this product
      if (matchCount >= 2 && !matchedProduct) {
        matchedProduct = product;
        title = productTitle;
        return false; // Stop searching
      }
      
      // Store first product as fallback
      if (i === 0) {
        matchedProduct = product;
        title = productTitle;
      }
    });
    
    if (matchedProduct && title) {
      // Get price from matched product
      const priceElement = matchedProduct.find('div.Nx9bqj, div._30jeq3, div.hl05eU, div._1_WHN1').first();
      
      if (priceElement.length) {
        price = priceElement.text().trim();
      }
      
      // Fallback: search for ₹ in this specific product
      if (!price) {
        matchedProduct.find('div, span').each((i, elem) => {
          const text = $(elem).text().trim();
          if (!price && text.includes('₹') && text.length < 15 && !text.includes('%')) {
            price = text;
            return false;
          }
        });
      }
      
      // Clean price - take only first ₹ amount
      if (price && price.split('₹').length > 2) {
        const firstPrice = price.match(/₹[0-9,]+/);
        if (firstPrice) {
          price = firstPrice[0];
        }
      }
      
      // Extract size from title
      const sizeMatch = title.match(/\(([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))\)/i) ||
                        title.match(/([0-9]+\s?(ml|g|kg|l|oz|gm|GM|ML|L|Pack))/i);
      if (sizeMatch) {
        size = sizeMatch[1] || sizeMatch[0];
      }
      
      image = matchedProduct.find('img').first().attr('src');
      link = matchedProduct.find('a').first().attr('href');
      rating = matchedProduct.find('div.XQDdHH, div.Rsc7Yb').first().text().trim();
      
      const productUrl = link ? `https://www.flipkart.com${link}` : searchUrl;
      
      return {
        title: title,
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
