package com.ecommerce.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "E-commerce Web Scraper API is running. Use /api/scraper/scrape endpoint to scrape products.";
    }
} 