const puppeteer = require('puppeteer');

async function scrapeFlipkart(query) {
  console.log(`[Flipkart] Scraping for: ${query}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    console.log(`[Flipkart] Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a bit for content to load
    await page.waitForTimeout(3000);
    
    // Extract product data
    const productData = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/p/"]');
      
      for (let i = 0; i < links.length && i < 30; i++) {
        const link = links[i];
        const rect = link.getBoundingClientRect();
        
        // Skip small elements
        if (rect.height < 50) continue;
        
        // Get all text
        const allText = link.textContent || '';
        
        // Find title by splitting text
        const textParts = allText.split(/[₹★\n]/).map(t => t.trim()).filter(t => t.length > 0);
        
        let title = '';
        for (const part of textParts) {
          // Skip prices, ratings, and short text
          if (/^\d+[,\d]*$/.test(part)) continue;
          if (/^\d\.\d$/.test(part)) continue;
          if (part.includes('% off')) continue;
          if (part.length < 15) continue;
          if (part.length > 200) continue;
          
          if (part.length > title.length) {
            title = part;
          }
        }
        
        if (!title || title.length < 10) continue;
        
        // Get price
        const priceMatch = allText.match(/₹([\d,]+)/);
        const price = priceMatch ? `₹${priceMatch[1]}` : null;
        
        // Get rating
        const ratingMatch = allText.match(/(\d\.\d)\s*★/);
        const rating = ratingMatch ? ratingMatch[1] : null;
        
        // Get image
        const img = link.querySelector('img');
        const image = img ? img.src : null;
        
        // Get URL
        const url = link.href;
        
        return { title, price, rating, image, url };
      }
      
      return null;
    });
    
    if (!productData) {
      console.log('[Flipkart] No product found');
      return {
        site: 'flipkart',
        error: true,
        message: 'No products found',
        searchUrl
      };
    }
    
    console.log('[Flipkart] Product found:', productData.title.substring(0, 50));
    
    return {
      site: 'flipkart',
      ...productData,
      searchUrl
    };
    
  } catch (error) {
    console.error('[Flipkart] Error:', error.message);
    return {
      site: 'flipkart',
      error: true,
      message: error.message,
      searchUrl: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = scrapeFlipkart;
```

---

### **5. Procfile** (For Railway)
```
web: node server.js
```

---

### **6. .gitignore**
```
node_modules/
.env
*.log