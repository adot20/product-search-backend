const express = require('express');
const cors = require('cors');
const amazonScraper = require('./scrapers/amazon');
const flipkartScraper = require('./scrapers/flipkart');

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
    const scrapers = {
      amazon: amazonScraper,
      flipkart: flipkartScraper
    };
    
    const promises = sites.map(site => {
      const scraper = scrapers[site];
      if (!scraper) {
        return Promise.resolve({
          site,
          error: true,
          message: `Scraper not available for ${site}`
        });
      }
      return scraper(query).catch(err => ({
        site,
        error: true,
        message: err.message
      }));
    });
    
    const results = await Promise.all(promises);
    
    console.log('Search completed:', results);
    
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
