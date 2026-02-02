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
  const { query, sites } = req.body;
  
  console.log(`Search request: "${query}" for sites:`, sites);
  
  if (!query || !sites || sites.length === 0) {
    return res.status(400).json({ 
      error: 'Missing query or sites' 
    });
  }
  
  try {
    // Create SIMPLE mock results for testing
    const results = sites.map(site => {
      // Return basic product info
      return {
        site: site,
        title: `${query} on ${site}`,
        price: '₹1,299', // Mock price
        rating: '4.2',
        image: null,
        url: getSearchUrl(site, query),
        searchUrl: getSearchUrl(site, query)
      };
    });
    
    console.log('Returning test results');
    
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
