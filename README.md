# SpyScraper - Competitive Intelligence Web Scraper

A modern web scraping application that helps gather competitive intelligence by scraping product information from various e-commerce websites.

## Features

- Scrape product data from multiple e-commerce platforms (eBay, Amazon)
- Modern, responsive dark-themed UI
- Real-time price distribution visualization
- Export data to CSV
- Pagination support
- Statistical analysis of scraped data

## Tech Stack

### Frontend
- React.js
- React Bootstrap
- Chart.js
- Axios
- React-Toastify

### Backend
- Spring Boot
- JSoup
- Lombok
- H2 Database

## Setup

### Prerequisites
- Node.js (v14 or higher)
- Java 11
- Maven

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### Backend Setup
1. Navigate to the root directory
2. Build the project:
   ```bash
   mvn clean install
   ```
3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

The frontend will run on `http://localhost:3000` and the backend on `http://localhost:8082`.

## Usage

1. Enter a product search URL from supported websites (e.g., ebay.com/sch/i.html?_nkw=laptop)
2. Click "Scrape" to start gathering data
3. View the results in the table format
4. Analyze price distribution in the chart
5. Export results to CSV if needed

## Contributing

Feel free to open issues and pull requests for any improvements you'd like to add.

## License

MIT License 