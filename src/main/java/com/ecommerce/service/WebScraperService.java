package com.ecommerce.service;

import com.ecommerce.model.Product;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class WebScraperService {
    
    private static final Logger logger = LoggerFactory.getLogger(WebScraperService.class);
    
    public List<Product> scrapeWebsite(String url) throws IOException {
        List<Product> products = new ArrayList<>();
        logger.info("Attempting to scrape URL: {}", url);
        
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.5")
                    .header("Accept-Encoding", "gzip, deflate, br")
                    .header("DNT", "1")
                    .header("Connection", "keep-alive")
                    .header("Upgrade-Insecure-Requests", "1")
                    .referrer("https://www.google.com")
                    .timeout(30000)
                    .followRedirects(true)
                    .maxBodySize(0)
                    .ignoreHttpErrors(true)
                    .get();

            if (doc.connection().response().statusCode() == 403) {
                logger.error("Access forbidden (403) - Website blocking scraping attempts");
                throw new IOException("This website is blocking automated access. Try a different website or use their official API if available.");
            }

            String domain = extractDomain(url);
            logger.info("Detected domain: {}", domain);
            
            switch (domain.toLowerCase()) {
                case "meesho.com":
                    products.addAll(scrapeMeesho(doc));
                    break;
                case "amazon.com":
                    products.addAll(scrapeAmazon(doc));
                    break;
                case "walmart.com":
                    products.addAll(scrapeWalmart(doc));
                    break;
                case "ebay.com":
                    products.addAll(scrapeEbay(doc));
                    break;
                default:
                    products.addAll(scrapeGeneric(doc));
            }
            
            logger.info("Successfully scraped {} products", products.size());
            return products;
            
        } catch (IOException e) {
            logger.error("Error scraping website: {}", e.getMessage());
            throw new IOException("Failed to connect to website. " + e.getMessage(), e);
        }
    }

    private List<Product> scrapeMeesho(Document doc) {
        List<Product> products = new ArrayList<>();
        Elements productElements = doc.select("div.ProductList__GridCol-sc-8lnc8o-0");
        logger.info("Found {} Meesho product elements", productElements.size());
        
        for (Element element : productElements) {
            try {
                Product product = new Product();
                product.setWebsite("Meesho");
                
                Element titleElement = element.selectFirst("p.Text__StyledText-sc-oo0kvp-0");
                if (titleElement != null) {
                    product.setName(titleElement.text());
                }
                
                Element priceElement = element.selectFirst("h5.Text__StyledText-sc-oo0kvp-0");
                if (priceElement != null) {
                    String priceText = priceElement.text().replaceAll("[^0-9.]", "");
                    if (!priceText.isEmpty()) {
                        product.setPrice(new BigDecimal(priceText));
                    }
                }
                
                Element imageElement = element.selectFirst("img");
                if (imageElement != null) {
                    product.setImageUrl(imageElement.attr("src"));
                }
                
                if (product.getName() != null && product.getPrice() != null) {
                    products.add(product);
                }
            } catch (Exception e) {
                logger.error("Error parsing Meesho product: {}", e.getMessage());
            }
        }
        
        return products;
    }

    private List<Product> scrapeAmazon(Document doc) throws IOException {
        List<Product> products = new ArrayList<>();
        String baseUrl = doc.baseUri();
        int maxPages = 20;
        int currentPage = 1;
        
        try {
            // Check if we're being blocked
            Elements captchaCheck = doc.select("form[action='/errors/validateCaptcha']");
            if (!captchaCheck.isEmpty()) {
                logger.error("Amazon is blocking access - detected CAPTCHA page");
                throw new IOException("Amazon is blocking automated access. Please try using eBay instead (ebay.com/sch/i.html?_nkw=laptop)");
            }

            while (currentPage <= maxPages) {
                String pageUrl = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "page=" + currentPage;
                Document pageDoc = currentPage == 1 ? doc : Jsoup.connect(pageUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .header("Accept-Encoding", "gzip, deflate, br")
                    .header("Cache-Control", "no-cache")
                    .header("Pragma", "no-cache")
                    .header("Dnt", "1")
                    .header("Sec-Ch-Ua", "\"Not A(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"")
                    .header("Sec-Ch-Ua-Mobile", "?0")
                    .header("Sec-Ch-Ua-Platform", "\"Windows\"")
                    .header("Sec-Fetch-Dest", "document")
                    .header("Sec-Fetch-Mode", "navigate")
                    .header("Sec-Fetch-Site", "none")
                    .header("Sec-Fetch-User", "?1")
                    .header("Upgrade-Insecure-Requests", "1")
                    .referrer("https://www.google.com")
                    .timeout(30000)
                    .get();

                // Check for blocking on subsequent pages
                captchaCheck = pageDoc.select("form[action='/errors/validateCaptcha']");
                if (!captchaCheck.isEmpty()) {
                    logger.error("Amazon is blocking access on page {} - detected CAPTCHA", currentPage);
                    break;
                }

                Elements productElements = pageDoc.select("div[data-component-type='s-search-result']");
                if (productElements.isEmpty()) {
                    logger.warn("No product elements found on Amazon page {} - possible blocking", currentPage);
                    break;
                }

                logger.info("Found {} Amazon product elements on page {}", productElements.size(), currentPage);
                
                for (Element element : productElements) {
                    try {
                        Product product = new Product();
                        product.setWebsite("Amazon");
                        
                        // Try multiple title selectors
                        Element titleElement = element.selectFirst("h2 span.a-text-normal");
                        if (titleElement == null) {
                            titleElement = element.selectFirst("h2 a.a-link-normal span");
                        }
                        if (titleElement == null) {
                            titleElement = element.selectFirst("h2 a.a-link-normal");
                        }
                        
                        if (titleElement != null) {
                            String title = titleElement.text().trim();
                            logger.debug("Found title: {}", title);
                            product.setName(title);
                        } else {
                            logger.debug("No title found for product element");
                            continue;
                        }
                        
                        // Try multiple price selectors
                        Element priceElement = element.selectFirst("span.a-price span.a-offscreen");
                        if (priceElement == null) {
                            priceElement = element.selectFirst("span.a-price:first-of-type span.a-offscreen");
                        }
                        if (priceElement == null) {
                            priceElement = element.selectFirst("span[data-a-color='base'] span.a-offscreen");
                        }
                        if (priceElement == null) {
                            priceElement = element.selectFirst("span.a-price-whole");
                        }
                        
                        if (priceElement != null) {
                            String priceText = priceElement.text().replaceAll("[^0-9.]", "").trim();
                            try {
                                if (!priceText.isEmpty()) {
                                    BigDecimal price = new BigDecimal(priceText);
                                    logger.debug("Found price: {}", price);
                                    product.setPrice(price);
                                }
                            } catch (NumberFormatException e) {
                                logger.error("Error parsing Amazon price: {} - {}", priceText, e.getMessage());
                                continue;
                            }
                        } else {
                            logger.debug("No price found for product element");
                            continue;
                        }
                        
                        // Get description if available
                        Element descriptionElement = element.selectFirst("div.a-row.a-size-base.a-color-secondary");
                        if (descriptionElement != null) {
                            String description = descriptionElement.text().trim();
                            logger.debug("Found description: {}", description);
                            product.setDescription(description);
                        }
                        
                        // Get product URL
                        Element linkElement = element.selectFirst("h2 a.a-link-normal");
                        if (linkElement != null) {
                            String href = linkElement.attr("href");
                            if (!href.startsWith("http")) {
                                href = "https://www.amazon.com" + href;
                            }
                            logger.debug("Found product URL: {}", href);
                            product.setProductUrl(href);
                        }
                        
                        // Only add products that have at least a name and price
                        if (product.getName() != null && product.getPrice() != null) {
                            products.add(product);
                            logger.info("Added Amazon product: {} - {}", product.getName(), product.getPrice());
                        }
                    } catch (Exception e) {
                        logger.error("Error parsing Amazon product: {}", e.getMessage());
                    }
                }
                
                if (products.size() >= 1000) {
                    logger.info("Reached maximum product limit (1000)");
                    break;
                }
                
                currentPage++;
                // Increase delay between requests to avoid being blocked
                Thread.sleep(3000);
            }
        } catch (Exception e) {
            logger.error("Error scraping Amazon pages: {}", e.getMessage());
            throw new IOException("Unable to scrape Amazon. Please try using eBay instead (ebay.com/sch/i.html?_nkw=laptop): " + e.getMessage());
        }
        
        if (products.isEmpty()) {
            throw new IOException("Amazon appears to be blocking access. Please try using eBay instead (ebay.com/sch/i.html?_nkw=laptop)");
        }
        
        logger.info("Successfully scraped {} Amazon products", products.size());
        return products;
    }

    private List<Product> scrapeWalmart(Document doc) {
        List<Product> products = new ArrayList<>();
        Elements productElements = doc.select("div[data-item-id]");
        logger.info("Found {} Walmart product elements", productElements.size());
        
        for (Element element : productElements) {
            try {
                Product product = new Product();
                product.setWebsite("Walmart");
                
                Element titleElement = element.selectFirst("span.normal");
                if (titleElement != null) {
                    product.setName(titleElement.text());
                }
                
                Element priceElement = element.selectFirst("div.price-main");
                if (priceElement != null) {
                    String priceText = priceElement.text().replace("$", "").replace(",", "");
                    if (!priceText.isEmpty()) {
                        product.setPrice(new BigDecimal(priceText));
                    }
                }
                
                Element imageElement = element.selectFirst("img.absolute");
                if (imageElement != null) {
                    product.setImageUrl(imageElement.attr("src"));
                }
                
                products.add(product);
            } catch (Exception e) {
                logger.error("Error parsing Walmart product: {}", e.getMessage());
            }
        }
        
        return products;
    }

    private List<Product> scrapeEbay(Document doc) throws IOException {
        List<Product> products = new ArrayList<>();
        String baseUrl = doc.baseUri();
        int maxPages = 20; // This will get us approximately 1200 products (60 per page)
        int currentPage = 1;
        
        try {
            while (currentPage <= maxPages) {
                String pageUrl = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "pgn=" + currentPage;
                Document pageDoc = currentPage == 1 ? doc : Jsoup.connect(pageUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
                    .header("Accept-Language", "en-US,en;q=0.5")
                    .header("Accept-Encoding", "gzip, deflate, br")
                    .header("DNT", "1")
                    .header("Connection", "keep-alive")
                    .header("Upgrade-Insecure-Requests", "1")
                    .referrer("https://www.google.com")
                    .timeout(30000)
                    .get();

                Elements productElements = pageDoc.select("li.s-item");
                if (productElements.isEmpty()) {
                    break; // No more products found
                }

                logger.info("Found {} eBay product elements on page {}", productElements.size(), currentPage);
                
                for (Element element : productElements) {
                    try {
                        Product product = new Product();
                        product.setWebsite("eBay");
                        
                        Element titleElement = element.selectFirst("div.s-item__title");
                        if (titleElement != null) {
                            product.setName(titleElement.text());
                        }
                        
                        Element descriptionElement = element.selectFirst("div.s-item__subtitle");
                        if (descriptionElement != null) {
                            product.setDescription(descriptionElement.text());
                        }
                        
                        Element priceElement = element.selectFirst("span.s-item__price");
                        if (priceElement != null) {
                            String priceText = priceElement.text().replaceAll("[^0-9.]", "");
                            if (!priceText.isEmpty()) {
                                try {
                                    product.setPrice(new BigDecimal(priceText));
                                } catch (NumberFormatException e) {
                                    logger.error("Error parsing price: {} - {}", priceText, e.getMessage());
                                }
                            }
                        }
                        
                        Element imageElement = element.selectFirst("img.s-item__image-img");
                        if (imageElement != null) {
                            product.setImageUrl(imageElement.attr("src"));
                        }
                        
                        if (product.getName() != null && product.getPrice() != null) {
                            products.add(product);
                        }
                    } catch (Exception e) {
                        logger.error("Error parsing eBay product: {}", e.getMessage());
                    }
                }
                
                if (products.size() >= 1000) {
                    break; // Stop if we've collected enough products
                }
                
                currentPage++;
                // Add a small delay between requests to be respectful to the server
                Thread.sleep(1000);
            }
        } catch (Exception e) {
            logger.error("Error scraping eBay pages: {}", e.getMessage());
        }
        
        return products;
    }

    private List<Product> scrapeGeneric(Document doc) {
        List<Product> products = new ArrayList<>();
        Elements productElements = doc.select("div.product, article.product, .item");
        logger.info("Found {} generic product elements", productElements.size());
        
        for (Element element : productElements) {
            try {
                Product product = new Product();
                
                Element titleElement = element.selectFirst("h1, h2, .title, .name");
                if (titleElement != null) {
                    product.setName(titleElement.text());
                }
                
                Element priceElement = element.selectFirst(".price, [itemprop='price']");
                if (priceElement != null) {
                    String priceText = priceElement.text().replaceAll("[^0-9.]", "");
                    if (!priceText.isEmpty()) {
                        product.setPrice(new BigDecimal(priceText));
                    }
                }
                
                Element imageElement = element.selectFirst("img");
                if (imageElement != null) {
                    product.setImageUrl(imageElement.attr("src"));
                }
                
                products.add(product);
            } catch (Exception e) {
                logger.error("Error parsing generic product: {}", e.getMessage());
            }
        }
        
        return products;
    }

    private String extractDomain(String url) {
        Pattern pattern = Pattern.compile("https?://(?:www\\.)?([^/]+)");
        Matcher matcher = pattern.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "";
    }
} 