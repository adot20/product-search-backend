const express = require('express');
const cors = require('cors');
// REMOVE THESE BROKEN IMPORTS:
// const amazonScraper = require('./scrapers/amazon');
// const flipkartScraper = require('./scrapers/flipkart');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Product Search Backend API',
    version: '1.0.0'
  });
});

app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    console.log(`Searching for: ${query} on sites:`, sites);
    
    const results = [];
    
    for (const site of sites) {
      console.log(`Processing ${site}...`);
      
      let productData = null;
      
      // Handle each site differently
      if (site === 'myntra') {
        productData = await scrapeMyntra(query);
      } else if (site === 'tira') {
        productData = await scrapeTira(query);
      } else {
        // For other sites, return test data for now
        productData = {
          title: `${query} on ${site}`,
          price: getRandomPrice(),
          rating: '4.2',
          url: getSearchUrl(site, query),
          searchUrl: getSearchUrl(site, query)
        };
      }
      
      results.push({
        site: site,
        ...productData
      });
      
      // Small delay between requests
      await delay(500);
    }
    
    console.log('Returning', results.length, 'results');
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to create search URLs
function getSearchUrl(site, query) {
  const encodedQuery = encodeURIComponent(query);
  const urls = {
    amazon: `https://www.amazon.in/s?k=${encodedQuery}`,
    flipkart: `https://www.flipkart.com/search?q=${encodedQuery}`,
    myntra: `https://www.myntra.com/${encodedQuery}`,
    ajio: `https://www.ajio.com/search/?text=${encodedQuery}`,
    nykaa: `https://www.nykaa.com/search/result/?q=${encodedQuery}`,
    tira: `https://www.tirabeauty.com/search?q=${encodedQuery}`
  };
  return urls[site] || '';
}

// Helper function for random prices (for testing)
function getRandomPrice() {
  const prices = ['₹499', '₹699', '₹899', '₹1,199', '₹1,499', '₹1,999', '₹2,499'];
  return prices[Math.floor(Math.random() * prices.length)];
}

// Helper function for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to create search URLs
function getSearchUrl(site, query) {
  const encodedQuery = encodeURIComponent(query);
  const urls = {
    amazon: `https://www.amazon.in/s?k=${encodedQuery}`,
    flipkart: `https://www.flipkart.com/search?q=${encodedQuery}`,
    myntra: `https://www.myntra.com/${encodedQuery}`,
    ajio: `https://www.ajio.com/search/?text=${encodedQuery}`,
    nykaa: `https://www.nykaa.com/search/result/?q=${encodedQuery}`,
    tira: `https://www.tirabeauty.com/search?q=${encodedQuery}`
  };
  return urls[site] || '';
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

