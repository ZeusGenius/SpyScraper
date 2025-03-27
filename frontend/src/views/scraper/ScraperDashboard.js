import React, { useState, useMemo } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CFormInput,
  CButton,
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilMagnifyingGlass } from '@coreui/icons'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const ScraperDashboard = () => {
  const [url, setUrl] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A'
    return `$${parseFloat(price).toFixed(2)}`
  }

  // Calculate price ranges for the chart
  const priceData = useMemo(() => {
    if (!products.length) return null
    
    const ranges = {
      '0-100': 0,
      '101-300': 0,
      '301-500': 0,
      '501-1000': 0,
      '1001+': 0
    }

    products.forEach(product => {
      const price = parseFloat(product.price || 0)
      if (price <= 100) ranges['0-100']++
      else if (price <= 300) ranges['101-300']++
      else if (price <= 500) ranges['301-500']++
      else if (price <= 1000) ranges['501-1000']++
      else ranges['1001+']++
    })

    return {
      labels: Object.keys(ranges),
      datasets: [
        {
          label: 'Number of Products',
          data: Object.values(ranges),
          backgroundColor: 'rgba(51, 153, 255, 0.5)',
          borderColor: 'rgba(51, 153, 255, 1)',
          borderWidth: 1,
        },
      ],
    }
  }, [products])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!products.length) return null
    
    const prices = products.map(p => parseFloat(p.price || 0)).filter(p => !isNaN(p))
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    
    return {
      total: products.length,
      avgPrice: formatPrice(avg),
      minPrice: formatPrice(min),
      maxPrice: formatPrice(max)
    }
  }, [products])

  const handleScrape = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.post('http://localhost:8082/api/scraper/scrape', url, {
        headers: {
          'Content-Type': 'text/plain'
        }
      })
      
      if (Array.isArray(response.data)) {
        setProducts(response.data)
        setPage(1) // Reset to first page when new data arrives
        if (response.data.length === 0) {
          setError('No products found on the specified website. Try a different URL or search term.')
        }
      } else {
        setProducts([])
        setError('Invalid response from server. Please try again.')
      }
    } catch (err) {
      setProducts([])
      setError(err.response?.data || 'Failed to scrape the website. Please check the URL and try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (products.length === 0) return

    const csvContent = [
      ['Name', 'Price', 'Description', 'Website'],
      ...products.map(product => [
        product.name || '',
        formatPrice(product.price).replace('$', '') || '',
        product.description || '',
        product.website || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'scraped_products.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Pagination
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return products.slice(start, start + itemsPerPage)
  }, [products, page, itemsPerPage])

  const pageCount = Math.ceil(products.length / itemsPerPage)

  return (
    <>
      <CCard className="mb-4">
        <CCardHeader>
          <h4 className="mb-0">E-commerce Web Scraper</h4>
        </CCardHeader>
        <CCardBody>
          <CRow className="mb-4">
            <CCol sm={12} md={8}>
              <CFormInput
                type="text"
                placeholder="Enter website URL (e.g., amazon.com/s?k=laptop)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
              <div className="small text-medium-emphasis">
                Try URLs like: amazon.com/s?k=laptop or ebay.com/sch/i.html?_nkw=laptop
              </div>
            </CCol>
            <CCol sm={12} md={4} className="d-flex align-items-end">
              <CButton
                color="primary"
                className="me-2"
                onClick={handleScrape}
                disabled={loading || !url}
              >
                {loading ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilMagnifyingGlass} className="me-2" />
                )}
                Scrape
              </CButton>
              {products.length > 0 && (
                <CButton color="secondary" onClick={handleExportCSV}>
                  <CIcon icon={cilCloudDownload} className="me-2" />
                  Export CSV
                </CButton>
              )}
            </CCol>
          </CRow>

          {error && (
            <CAlert color="info" dismissible>
              {error}
            </CAlert>
          )}

          {products.length > 0 && (
            <>
              <CRow className="mb-4">
                <CCol sm={6} lg={3}>
                  <CCard className="mb-4">
                    <CCardBody className="text-center">
                      <div className="text-medium-emphasis small">Total Products</div>
                      <div className="fs-2 fw-semibold">{stats.total}</div>
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                  <CCard className="mb-4">
                    <CCardBody className="text-center">
                      <div className="text-medium-emphasis small">Average Price</div>
                      <div className="fs-2 fw-semibold">{stats.avgPrice}</div>
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                  <CCard className="mb-4">
                    <CCardBody className="text-center">
                      <div className="text-medium-emphasis small">Min Price</div>
                      <div className="fs-2 fw-semibold">{stats.minPrice}</div>
                    </CCardBody>
                  </CCard>
                </CCol>
                <CCol sm={6} lg={3}>
                  <CCard className="mb-4">
                    <CCardBody className="text-center">
                      <div className="text-medium-emphasis small">Max Price</div>
                      <div className="fs-2 fw-semibold">{stats.maxPrice}</div>
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              <CCard className="mb-4">
                <CCardHeader>Price Distribution</CCardHeader>
                <CCardBody>
                  <div style={{ height: '300px' }}>
                    {priceData && <Bar data={priceData} options={{ maintainAspectRatio: false }} />}
                  </div>
                </CCardBody>
              </CCard>

              <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <div>Scraped Products</div>
                  <CFormSelect
                    className="w-auto"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value))
                      setPage(1)
                    }}
                  >
                    <option value="12">12 per page</option>
                    <option value="24">24 per page</option>
                    <option value="48">48 per page</option>
                  </CFormSelect>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    {paginatedProducts.map((product, index) => (
                      <CCol sm={6} lg={4} key={index}>
                        <CCard className="mb-4">
                          {product.imageUrl && (
                            <img
                              className="card-img-top"
                              src={product.imageUrl}
                              alt={product.name}
                              style={{ height: '200px', objectFit: 'cover' }}
                            />
                          )}
                          <CCardBody>
                            <h5>{product.name}</h5>
                            <p className="text-medium-emphasis">
                              Price: {formatPrice(product.price)}
                            </p>
                            {product.website && (
                              <p className="text-medium-emphasis small">
                                Website: {product.website}
                              </p>
                            )}
                          </CCardBody>
                        </CCard>
                      </CCol>
                    ))}
                  </CRow>

                  {pageCount > 1 && (
                    <CPagination className="justify-content-center" aria-label="Page navigation">
                      {Array.from({ length: pageCount }, (_, i) => (
                        <CPaginationItem
                          key={i + 1}
                          active={page === i + 1}
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </CPaginationItem>
                      ))}
                    </CPagination>
                  )}
                </CCardBody>
              </CCard>
            </>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default ScraperDashboard 