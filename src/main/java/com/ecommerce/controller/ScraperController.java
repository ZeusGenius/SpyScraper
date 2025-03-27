package com.ecommerce.controller;

import com.ecommerce.model.Product;
import com.ecommerce.service.WebScraperService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.util.List;
import java.util.Collections;

@RestController
@RequestMapping("/api/scraper")
@CrossOrigin(origins = "http://localhost:3001")
public class ScraperController {

    private static final Logger logger = LoggerFactory.getLogger(ScraperController.class);

    @Autowired
    private WebScraperService webScraperService;

    @PostMapping("/scrape")
    public ResponseEntity<?> scrapeWebsite(@RequestBody String url) {
        try {
            // Remove quotes and decode URL
            url = url.replace("\"", "").trim();
            url = URLDecoder.decode(url, StandardCharsets.UTF_8.toString());
            
            logger.info("Received scraping request for URL: {}", url);
            
            if (url.isEmpty()) {
                logger.error("Empty URL provided");
                return ResponseEntity.ok(Collections.emptyList());
            }
            
            // Only add https:// if the URL doesn't already have a protocol
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }
            
            List<Product> products = webScraperService.scrapeWebsite(url);
            
            if (products.isEmpty()) {
                logger.warn("No products found for URL: {}", url);
                return ResponseEntity.ok(Collections.emptyList());
            }
            
            logger.info("Successfully scraped {} products from {}", products.size(), url);
            return ResponseEntity.ok(products);
            
        } catch (IOException e) {
            logger.error("Error scraping website: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        } catch (Exception e) {
            logger.error("Unexpected error: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
} 