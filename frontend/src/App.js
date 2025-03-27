import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Alert,
  Spinner,
  Pagination,
  Table,
} from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import spyScraperLogo from './spyscraper-logo.png';  // Import the logo directly

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [url, setUrl] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [showStats, setShowStats] = useState(false);

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false  // Hide legend since we have clear labels
      },
      title: {
        display: true,
        text: 'Product Price Distribution',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          family: 'Inter, sans-serif',
          size: 18,
          weight: '600'
        },
        padding: {
          top: 20,
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Products: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Inter, sans-serif',
            size: 12
          },
          callback: function(value) {
            if (value % 1 === 0) {
              return value;
            }
          }
        },
        title: {
          display: true,
          text: 'Number of Products',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        },
        title: {
          display: true,
          text: 'Price Range ($)',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: '500'
          }
        }
      }
    }
  };

  // Calculate price ranges for the chart
  const priceData = useMemo(() => {
    if (!products.length) return null;
    
    const ranges = {
      '$0-50': 0,
      '$51-100': 0,
      '$101-200': 0,
      '$201-500': 0,
      '$501-1000': 0,
      '$1000+': 0
    };

    products.forEach(product => {
      const price = parseFloat(product.price);
      // Skip invalid prices
      if (isNaN(price)) return;
      
      if (price <= 50) ranges['$0-50']++;
      else if (price <= 100) ranges['$51-100']++;
      else if (price <= 200) ranges['$101-200']++;
      else if (price <= 500) ranges['$201-500']++;
      else if (price <= 1000) ranges['$501-1000']++;
      else ranges['$1000+']++;
    });

    return {
      labels: Object.keys(ranges),
      datasets: [
        {
          data: Object.values(ranges),
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',   // Blue
            'rgba(75, 192, 192, 0.7)',   // Teal
            'rgba(255, 206, 86, 0.7)',   // Yellow
            'rgba(153, 102, 255, 0.7)',  // Purple
            'rgba(255, 159, 64, 0.7)',   // Orange
            'rgba(255, 99, 132, 0.7)'    // Red
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1,
          borderRadius: 6,
          hoverOffset: 4
        }
      ]
    };
  }, [products]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!products.length) return null;
    
    const prices = products.map(p => parseFloat(p.price || 0)).filter(p => !isNaN(p));
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return {
      total: products.length,
      avgPrice: formatPrice(avg),
      minPrice: formatPrice(min),
      maxPrice: formatPrice(max)
    };
  }, [products]);

  const handleScrape = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setShowStats(false);
      
      const response = await axios.post('http://localhost:8082/api/scraper/scrape', url, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });
      
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        setPage(1);
        if (response.data.length === 0) {
          toast.info('No products found. Try a different URL or search term.');
        } else {
          toast.success(`Successfully scraped ${response.data.length} products!`);
          setShowStats(true);
        }
      } else {
        setProducts([]);
        toast.error('Invalid response from server. Please try again.');
      }
    } catch (err) {
      setProducts([]);
      toast.error(err.response?.data || 'Failed to scrape the website. Please check the URL and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (products.length === 0) return;

    const csvContent = [
      ['Name', 'Price', 'Description', 'Website'],
      ...products.map(product => [
        product.name || '',
        formatPrice(product.price).replace('$', '') || '',
        product.description || '',
        product.website || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'scraped_products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV file downloaded successfully!');
  };

  // Pagination
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return products.slice(start, start + itemsPerPage);
  }, [products, page, itemsPerPage]);

  const pageCount = Math.ceil(products.length / itemsPerPage);

  return (
    <>
      <ToastContainer 
        position="top-right" 
        theme="dark"
        autoClose={3000}
      />
      <div className="app-container">
        <div className="logo-container">
          <img 
            src={spyScraperLogo}
            alt="SpyScraper Logo" 
            className="app-logo"
          />
          <h1 className="app-title">Adaptive Web Scraper For Competitive Intelligence</h1>
        </div>
        <Container>
          <div className="fade-in">
            <Card className="search-card">
              <Card.Body>
                <Form onSubmit={handleScrape}>
                  <Row>
                    <Col md={9}>
                      <Form.Group>
                        <Form.Label>Website URL</Form.Label>
                        <Form.Control
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="Enter website URL (e.g., amazon.com/s?k=laptop)"
                          disabled={loading}
                          className="search-input"
                        />
                        <Form.Text>
                          Try URLs like: amazon.com/s?k=laptop or ebay.com/sch/i.html?_nkw=laptop
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Button
                        type="submit"
                        disabled={loading || !url}
                        className="search-button w-100"
                      >
                        {loading ? (
                          <>
                            <Spinner size="sm" />
                            <span>Scraping...</span>
                          </>
                        ) : (
                          'Scrape'
                        )}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>

            {showStats && stats && (
              <div className="fade-in">
                <Row className="mb-4">
                  <Col sm={6} lg={3} className="mb-3 mb-lg-0">
                    <Card className="stat-card">
                      <Card.Body>
                        <div className="stat-title">Total Products</div>
                        <div className="stat-value">{stats.total}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col sm={6} lg={3} className="mb-3 mb-lg-0">
                    <Card className="stat-card">
                      <Card.Body>
                        <div className="stat-title">Average Price</div>
                        <div className="stat-value">{stats.avgPrice}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col sm={6} lg={3} className="mb-3 mb-lg-0">
                    <Card className="stat-card">
                      <Card.Body>
                        <div className="stat-title">Lowest Price</div>
                        <div className="stat-value">{stats.minPrice}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col sm={6} lg={3}>
                    <Card className="stat-card">
                      <Card.Body>
                        <div className="stat-title">Highest Price</div>
                        <div className="stat-value">{stats.maxPrice}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Card className="chart-card mb-4">
                  <Card.Header className="chart-header">Price Distribution</Card.Header>
                  <Card.Body>
                    <div style={{ height: '300px' }}>
                      {priceData && (
                        <Bar
                          data={priceData}
                          options={chartOptions}
                        />
                      )}
                    </div>
                  </Card.Body>
                </Card>

                <Card className="table-card">
                  <Card.Header className="table-header">
                    <h5>Scraped Products</h5>
                    <div className="d-flex align-items-center gap-3">
                      <span className="text-white-50">
                        {products.length} products found
                      </span>
                      <Button 
                        variant="success" 
                        onClick={handleExportCSV}
                        className="export-button"
                        size="sm"
                      >
                        Export CSV
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className="table-responsive">
                      <Table className="product-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>PRODUCT NAME</th>
                            <th>PRICE</th>
                            <th>WEBSITE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProducts.map((product, index) => (
                            <tr key={index} className="product-row">
                              <td>{(page - 1) * itemsPerPage + index + 1}</td>
                              <td>{product.name}</td>
                              <td>{formatPrice(product.price)}</td>
                              <td>{product.website}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>

                    {pageCount > 1 && (
                      <div className="pagination-container">
                        <Pagination>
                          <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
                          <Pagination.Prev onClick={() => setPage(p => p - 1)} disabled={page === 1} />
                          {Array.from({ length: pageCount }, (_, i) => {
                            if (pageCount > 7) {
                              if (
                                i === 0 ||
                                i === pageCount - 1 ||
                                (i >= page - 2 && i <= page) ||
                                (i >= page && i <= page + 1)
                              ) {
                                return (
                                  <Pagination.Item
                                    key={i + 1}
                                    active={page === i + 1}
                                    onClick={() => setPage(i + 1)}
                                  >
                                    {i + 1}
                                  </Pagination.Item>
                                );
                              } else if (i === 1 || i === pageCount - 2) {
                                return <Pagination.Ellipsis key={`ellipsis-${i}`} />;
                              }
                              return null;
                            }
                            return (
                              <Pagination.Item
                                key={i + 1}
                                active={page === i + 1}
                                onClick={() => setPage(i + 1)}
                              >
                                {i + 1}
                              </Pagination.Item>
                            );
                          })}
                          <Pagination.Next onClick={() => setPage(p => p + 1)} disabled={page === pageCount} />
                          <Pagination.Last onClick={() => setPage(pageCount)} disabled={page === pageCount} />
                        </Pagination>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            )}
          </div>
        </Container>
      </div>
    </>
  );
}

export default App;
